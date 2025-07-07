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

// GET - Detalhes da sessão
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; sessionId: string }> }) {
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
    const { id, sessionId } = await params;
    
    console.log("Debug - Session Details API - IDs recebidos:", { id, sessionId });
    
    const squadId = parseInt(id);
    const sessionIdNum = parseInt(sessionId);
    
    console.log("Debug - Session Details API - IDs após parseInt:", { squadId, sessionIdNum });

    if (isNaN(squadId) || squadId <= 0 || isNaN(sessionIdNum) || sessionIdNum <= 0) {
      console.log("Debug - Session Details API - IDs inválidos:", { id, sessionId, squadId, sessionIdNum });
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    // Verificar se é membro do squad
    const memberCheck = await sql`
      SELECT 1 FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND is_active = true
    `;

    if (!memberCheck.length) {
      return NextResponse.json({ error: "Você não tem acesso a este squad" }, { status: 403 });
    }

    // Buscar detalhes da sessão
    const session = await sql`
      SELECT 
        gs.*,
        u.display_name as creator_name,
        u.avatar_url as creator_avatar
      FROM game_sessions gs
      JOIN users u ON gs.created_by = u.id
      WHERE gs.id = ${sessionIdNum} AND gs.squad_id = ${squadId}
    `;

    if (!session.length) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    // Buscar participantes
    const participants = await sql`
      SELECT 
        sc.status,
        sc.confirmed_at,
        u.display_name,
        u.avatar_url,
        u.id as user_id
      FROM session_confirmations sc
      JOIN users u ON sc.user_id = u.id
      WHERE sc.session_id = ${sessionIdNum}
      ORDER BY sc.confirmed_at ASC
    `;

    return NextResponse.json({
      success: true,
      session: session[0],
      participants: participants,
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes da sessão:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PATCH - Confirmar/Recusar participação
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; sessionId: string }> }) {
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
    const { id, sessionId } = await params;
    const { status } = await request.json();
    
    console.log("Debug - Participation API - IDs recebidos:", { id, sessionId });
    
    const squadId = parseInt(id);
    const sessionIdNum = parseInt(sessionId);
    
    console.log("Debug - Participation API - IDs após parseInt:", { squadId, sessionIdNum });

    if (isNaN(squadId) || squadId <= 0 || isNaN(sessionIdNum) || sessionIdNum <= 0) {
      console.log("Debug - Participation API - IDs inválidos:", { id, sessionId, squadId, sessionIdNum });
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    if (!['confirmed', 'declined'].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    // Verificar se é membro do squad
    const memberCheck = await sql`
      SELECT 1 FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND is_active = true
    `;

    if (!memberCheck.length) {
      return NextResponse.json({ error: "Você não tem acesso a este squad" }, { status: 403 });
    }

    // Verificar se a sessão existe
    const sessionCheck = await sql`
      SELECT scheduled_date, max_participants 
      FROM game_sessions 
      WHERE id = ${sessionIdNum} AND squad_id = ${squadId}
    `;

    if (!sessionCheck.length) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    if (new Date(sessionCheck[0].scheduled_date) <= new Date()) {
      return NextResponse.json({ error: "Não é possível alterar participação em sessões passadas" }, { status: 400 });
    }

    // Se confirmando, verificar se há vagas
    if (status === 'confirmed') {
      const currentParticipants = await sql`
        SELECT COUNT(*) as count 
        FROM session_confirmations 
        WHERE session_id = ${sessionIdNum} AND status = 'confirmed'
      `;

      if (currentParticipants[0].count >= sessionCheck[0].max_participants) {
        return NextResponse.json({ error: "Sessão lotada" }, { status: 400 });
      }
    }

    // Inserir ou atualizar participação
    await sql`
      INSERT INTO session_confirmations (session_id, user_id, status, confirmed_at)
      VALUES (${sessionIdNum}, ${userId}, ${status}, ${status === 'confirmed' ? 'NOW()' : null})
      ON CONFLICT (session_id, user_id)
      DO UPDATE SET 
        status = ${status}, 
        confirmed_at = ${status === 'confirmed' ? 'NOW()' : null}
    `;

    return NextResponse.json({
      success: true,
      message: status === 'confirmed' ? "Participação confirmada" : "Participação recusada",
    });
  } catch (error) {
    console.error("Erro ao atualizar participação:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}