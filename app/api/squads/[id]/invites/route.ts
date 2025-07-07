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

// GET - Listar convites pendentes do usuário
export async function GET(request: NextRequest) {
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

    // Buscar convites de squad pendentes
    const invites = await sql`
      SELECT 
        n.id,
        n.message,
        n.created_at,
        n.from_user_id,
        u.display_name as inviter_name,
        u.avatar_url as inviter_avatar,
        -- Extrair squad_id do link
        CAST(SUBSTRING(n.link FROM '/squad/([0-9]+)') AS INTEGER) as squad_id,
        s.name as squad_name,
        s.description as squad_description,
        s.max_members,
        COUNT(sm.id) as current_members
      FROM notifications n
      JOIN users u ON n.from_user_id = u.id
      JOIN squads s ON CAST(SUBSTRING(n.link FROM '/squad/([0-9]+)') AS INTEGER) = s.id
      LEFT JOIN squad_members sm ON s.id = sm.squad_id AND sm.is_active = true
      WHERE n.user_id = ${userId} 
        AND n.type = 'squad_invite' 
        AND n.is_read = false
      GROUP BY n.id, n.message, n.created_at, n.from_user_id, u.display_name, u.avatar_url, s.id, s.name, s.description, s.max_members
      ORDER BY n.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      invites: invites,
    });
  } catch (error) {
    console.error("Erro ao buscar convites:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Aceitar/Recusar convite
export async function POST(request: NextRequest) {
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
    const { inviteId, action } = await request.json(); // action: 'accept' ou 'decline'

    // Buscar o convite
    const invite = await sql`
      SELECT 
        n.id,
        n.from_user_id,
        CAST(SUBSTRING(n.link FROM '/squad/([0-9]+)') AS INTEGER) as squad_id,
        s.name as squad_name,
        s.max_members,
        COUNT(sm.id) as current_members
      FROM notifications n
      JOIN squads s ON CAST(SUBSTRING(n.link FROM '/squad/([0-9]+)') AS INTEGER) = s.id
      LEFT JOIN squad_members sm ON s.id = sm.squad_id AND sm.is_active = true
      WHERE n.id = ${inviteId} 
        AND n.user_id = ${userId} 
        AND n.type = 'squad_invite' 
        AND n.is_read = false
      GROUP BY n.id, n.from_user_id, s.id, s.name, s.max_members
    `;

    if (!invite.length) {
      return NextResponse.json({ error: "Convite não encontrado ou já processado" }, { status: 404 });
    }

    const squadId = invite[0].squad_id;

    if (action === 'accept') {
      // Verificar se o squad ainda tem espaço
      if (invite[0].current_members >= invite[0].max_members) {
        // Marcar convite como lido mesmo se o squad estiver lotado
        await sql`
          UPDATE notifications 
          SET is_read = true 
          WHERE id = ${inviteId}
        `;
        return NextResponse.json({ error: "Squad está lotado" }, { status: 400 });
      }

      // Verificar se já é membro
      const existingMember = await sql`
        SELECT 1 FROM squad_members 
        WHERE squad_id = ${squadId} AND user_id = ${userId}
      `;

      if (existingMember.length) {
        // Marcar convite como lido
        await sql`
          UPDATE notifications 
          SET is_read = true 
          WHERE id = ${inviteId}
        `;
        return NextResponse.json({ error: "Você já é membro deste squad" }, { status: 400 });
      }

      // Adicionar ao squad
      await sql`
        INSERT INTO squad_members (squad_id, user_id, role)
        VALUES (${squadId}, ${userId}, 'member')
      `;

      // Criar notificação para quem convidou
      await sql`
        INSERT INTO notifications (user_id, type, message, from_user_id, link)
        VALUES (
          ${invite[0].from_user_id}, 
          'squad_invite_accepted', 
          'Seu convite para o squad "${invite[0].squad_name}" foi aceito!',
          ${userId},
          '/squad/${squadId}'
        )
      `;

      var message = `Você entrou no squad "${invite[0].squad_name}"!`;
    } else {
      // Criar notificação para quem convidou (opcional)
      await sql`
        INSERT INTO notifications (user_id, type, message, from_user_id, link)
        VALUES (
          ${invite[0].from_user_id}, 
          'squad_invite_declined', 
          'Seu convite para o squad "${invite[0].squad_name}" foi recusado.',
          ${userId},
          '/squad/${squadId}'
        )
      `;

      var message = `Você recusou o convite para o squad "${invite[0].squad_name}".`;
    }

    // Marcar convite como lido
    await sql`
      UPDATE notifications 
      SET is_read = true 
      WHERE id = ${inviteId}
    `;

    return NextResponse.json({
      success: true,
      message: message,
    });
  } catch (error) {
    console.error("Erro ao processar convite:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}