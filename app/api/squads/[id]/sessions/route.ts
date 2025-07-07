import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

function verifyToken(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch (error) {
    return null;
  }
}

// GET - Buscar sessões do squad
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const userId = payload.userId;
    const { id } = await params;
    
    console.log("Debug - Sessions API - ID recebido:", id, "tipo:", typeof id);
    
    const squadId = parseInt(id);
    
    console.log("Debug - Sessions API - squadId após parseInt:", squadId, "isNaN:", isNaN(squadId));

    if (isNaN(squadId) || squadId <= 0) {
      console.log("Debug - Sessions API - ID inválido:", { id, squadId });
      return NextResponse.json({ error: "ID do squad inválido" }, { status: 400 });
    }

    // Verificar se é membro do squad
    const memberCheck = await sql`
      SELECT 1 FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND is_active = true
    `;

    if (!memberCheck.length) {
      return NextResponse.json({ error: "Você não tem acesso a este squad" }, { status: 403 });
    }

    // Buscar sessões
    const sessions = await sql`
      SELECT 
        gs.id,
        gs.title,
        gs.description,
        gs.game_name,
        gs.scheduled_date,
        gs.duration_minutes,
        gs.max_participants,
        gs.status,
        gs.created_at,
        u.display_name as creator_name,
        u.avatar_url as creator_avatar,
        COUNT(sc.id) as total_participants,
        COUNT(CASE WHEN sc.status = 'confirmed' THEN 1 END) as confirmed_participants,
        MAX(CASE WHEN sc.user_id = ${userId} THEN sc.status END) as user_status
      FROM game_sessions gs
      JOIN users u ON gs.created_by = u.id
      LEFT JOIN session_confirmations sc ON gs.id = sc.session_id
      WHERE gs.squad_id = ${squadId}
        AND gs.scheduled_date >= NOW() - INTERVAL '1 day'
      GROUP BY gs.id, gs.title, gs.description, gs.game_name, gs.scheduled_date, 
               gs.duration_minutes, gs.max_participants, gs.status, gs.created_at, 
               u.display_name, u.avatar_url
      ORDER BY gs.scheduled_date ASC
    `;

    return NextResponse.json({
      success: true,
      sessions: sessions,
    });
  } catch (error) {
    console.error("Erro ao buscar sessões:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Criar nova sessão
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const userId = payload.userId;
    const { id } = await params;
    
    console.log("Debug - Create Session API - ID recebido:", id, "tipo:", typeof id);
    
    const squadId = parseInt(id);
    
    console.log("Debug - Create Session API - squadId após parseInt:", squadId, "isNaN:", isNaN(squadId));

    if (isNaN(squadId) || squadId <= 0) {
      console.log("Debug - Create Session API - ID inválido:", { id, squadId });
      return NextResponse.json({ error: "ID do squad inválido" }, { status: 400 });
    }

    const { title, description, gameName, scheduledDate, duration, maxParticipants } = await request.json();

    // Validações
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
    }

    if (!gameName || gameName.trim().length === 0) {
      return NextResponse.json({ error: "Nome do jogo é obrigatório" }, { status: 400 });
    }

    if (!scheduledDate) {
      return NextResponse.json({ error: "Data é obrigatória" }, { status: 400 });
    }

    const sessionDate = new Date(scheduledDate);
    if (sessionDate <= new Date()) {
      return NextResponse.json({ error: "Data deve ser no futuro" }, { status: 400 });
    }

    // Verificar se é líder ou moderador
    const permissionCheck = await sql`
      SELECT role FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND is_active = true
      AND (role = 'leader' OR role = 'moderator')
    `;

    if (!permissionCheck.length) {
      return NextResponse.json({ error: "Apenas líderes e moderadores podem criar sessões" }, { status: 403 });
    }

    // Criar sessão
    const newSession = await sql`
      INSERT INTO game_sessions (
        squad_id, created_by, title, description, game_name, 
        scheduled_date, duration_minutes, max_participants
      )
      VALUES (
        ${squadId}, ${userId}, ${title.trim()}, ${description?.trim() || null}, 
        ${gameName.trim()}, ${sessionDate.toISOString()}, 
        ${parseInt(duration) || 60}, ${parseInt(maxParticipants) || 5}
      )
      RETURNING id, title, scheduled_date
    `;

    // Automaticamente confirmar o criador
    await sql`
      INSERT INTO session_confirmations (session_id, user_id, status, confirmed_at)
      VALUES (${newSession[0].id}, ${userId}, 'confirmed', NOW())
    `;

    // 🔔 NOTIFICAR MEMBROS DO SQUAD
    const creatorInfo = await sql`
      SELECT display_name FROM users WHERE id = ${userId}
    `;

    const squadInfo = await sql`
      SELECT name FROM squads WHERE id = ${squadId}
    `;

    // Buscar todos os membros do squad (exceto o criador)
    const squadMembers = await sql`
      SELECT user_id FROM squad_members 
      WHERE squad_id = ${squadId} 
        AND user_id != ${userId} 
        AND is_active = true
    `;

    // Criar notificações para cada membro
    if (squadMembers.length > 0) {
      const formattedDate = new Date(sessionDate).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });

      const notifications = squadMembers.map(member => sql`
        INSERT INTO notifications (
          user_id, 
          type, 
          title,
          message, 
          from_user_id, 
          reference_id,
          reference_type,
          data,
          created_at
        )
        VALUES (
          ${member.user_id},
          'game_session_created',
          'Nova sessão de jogo! 🎮',
          '${creatorInfo[0].display_name} criou uma nova sessão: "${title.trim()}" agendada para ${formattedDate}',
          ${userId},
          ${newSession[0].id},
          'game_session',
          ${JSON.stringify({
            sessionId: newSession[0].id,
            squadId: squadId,
            squadName: squadInfo[0].name,
            gameName: gameName.trim(),
            scheduledDate: sessionDate.toISOString(),
            creatorName: creatorInfo[0].display_name
          })},
          NOW()
        )
      `);

      // Executar todas as notificações
      await Promise.all(notifications);
    }

    return NextResponse.json({
      success: true,
      session: newSession[0],
      message: "Sessão criada com sucesso",
      notificationsSent: squadMembers.length
    });
  } catch (error) {
    console.error("Erro ao criar sessão:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}