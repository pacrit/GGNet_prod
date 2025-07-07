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

// GET - Listar membros do squad
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
    const squadId = parseInt(id);

    // Verificar se o usuário é membro do squad
    const memberCheck = await sql`
      SELECT 1 FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND is_active = true
    `;

    if (!memberCheck.length) {
      return NextResponse.json({ error: "Você não tem acesso a este squad" }, { status: 403 });
    }

    // Buscar membros do squad
    const members = await sql`
      SELECT 
        sm.id,
        sm.user_id,
        sm.role,
        sm.joined_at,
        sm.is_active,
        u.display_name,
        u.email,
        u.avatar_url
      FROM squad_members sm
      JOIN users u ON sm.user_id = u.id
      WHERE sm.squad_id = ${squadId} AND sm.is_active = true
      ORDER BY 
        CASE sm.role 
          WHEN 'leader' THEN 1
          WHEN 'moderator' THEN 2
          ELSE 3
        END,
        sm.joined_at ASC
    `;

    return NextResponse.json({
      success: true,
      members: members,
    });
  } catch (error) {
    console.error("Erro ao buscar membros:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Convidar membro
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
    const squadId = parseInt(id);
    const { invitedUserId } = await request.json();

    // Converter para números explicitamente
    const invitedUserIdNum = parseInt(invitedUserId);
    
    if (isNaN(invitedUserIdNum)) {
      return NextResponse.json({ error: "ID do usuário inválido" }, { status: 400 });
    }

    // Verificar se o usuário é líder ou moderador
    const leaderCheck = await sql`
      SELECT role FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND is_active = true
      AND (role = 'leader' OR role = 'moderator')
    `;

    if (!leaderCheck.length) {
      return NextResponse.json({ error: "Apenas líderes e moderadores podem convidar membros" }, { status: 403 });
    }

    // Verificar se o squad existe e tem espaço
    const squadInfo = await sql`
      SELECT s.max_members, s.name, COUNT(sm.id) as current_members
      FROM squads s
      LEFT JOIN squad_members sm ON s.id = sm.squad_id AND sm.is_active = true
      WHERE s.id = ${squadId}
      GROUP BY s.id, s.max_members, s.name
    `;

    if (!squadInfo.length) {
      return NextResponse.json({ error: "Squad não encontrado" }, { status: 404 });
    }

    if (squadInfo[0].current_members >= squadInfo[0].max_members) {
      return NextResponse.json({ error: "Squad está lotado" }, { status: 400 });
    }

    // Verificar se o usuário já é membro
    const existingMember = await sql`
      SELECT 1 FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${invitedUserIdNum}
    `;

    if (existingMember.length) {
      return NextResponse.json({ error: "Usuário já é membro do squad" }, { status: 400 });
    }

    // Verificar se são amigos
    const friendshipCheck = await sql`
      SELECT 1 FROM friends 
      WHERE ((user_id = ${userId} AND friend_id = ${invitedUserIdNum}) 
         OR (user_id = ${invitedUserIdNum} AND friend_id = ${userId}))
      AND status = 'accepted'
    `;

    if (!friendshipCheck.length) {
      return NextResponse.json({ error: "Você só pode convidar amigos" }, { status: 400 });
    }

    // Criar convite (notificação) - usando variáveis explícitas para evitar erros de tipo
    const notificationType = 'squad_invite';
    const notificationMessage = `Você foi convidado para entrar no squad "${squadInfo[0].name}"`;
    const notificationLink = `/squad/${squadId}`;

    await sql`
      INSERT INTO notifications (user_id, type, message, from_user_id, link)
      VALUES (
        ${invitedUserIdNum}::integer, 
        ${notificationType}::text, 
        ${notificationMessage}::text,
        ${userId}::integer,
        ${notificationLink}::text
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Convite enviado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao convidar membro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
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
    const { id, memberId } = await params;

    const squadId = parseInt(id);
    const memberIdNum = parseInt(memberId);

    if (isNaN(squadId) || isNaN(memberIdNum)) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    // Verificar se o usuário tem permissão para remover membros
    const userCheck = await sql`
      SELECT role FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND is_active = true
    `;

    if (!userCheck.length) {
      return NextResponse.json({ error: "Você não tem acesso a este squad" }, { status: 403 });
    }

    const userRole = userCheck[0].role;

    if (userRole !== "leader" && userRole !== "moderator") {
      return NextResponse.json({ error: "Você não tem permissão para remover membros" }, { status: 403 });
    }

    // Verificar se o membro existe
    const memberCheck = await sql`
      SELECT role, user_id FROM squad_members 
      WHERE squad_id = ${squadId} AND id = ${memberIdNum} AND is_active = true
    `;

    if (!memberCheck.length) {
      return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    }

    const memberRole = memberCheck[0].role;
    const targetUserId = memberCheck[0].user_id;

    // Não pode remover o próprio membro
    if (targetUserId === userId) {
      return NextResponse.json({ error: "Você não pode remover a si mesmo" }, { status: 400 });
    }

    // Não pode remover o líder
    if (memberRole === "leader") {
      return NextResponse.json({ error: "Não é possível remover o líder do squad" }, { status: 403 });
    }

    // Moderador não pode remover outro moderador
    if (userRole === "moderator" && memberRole === "moderator") {
      return NextResponse.json({ error: "Moderadores não podem remover outros moderadores" }, { status: 403 });
    }

    // Remover o membro (soft delete)
    await sql`
      UPDATE squad_members 
      SET is_active = false, updated_at = NOW()
      WHERE squad_id = ${squadId} AND id = ${memberIdNum}
    `;

    // Buscar informações para notificação
    const squadInfo = await sql`
      SELECT name FROM squads WHERE id = ${squadId}
    `;

    // Criar notificação para o membro removido
    await sql`
      INSERT INTO notifications (
        user_id, 
        type, 
        title,
        message, 
        from_user_id,
        reference_id,
        reference_type,
        created_at
      )
      VALUES (
        ${targetUserId},
        'removed_from_squad',
        'Removido do squad 😢',
        'Você foi removido do squad "${squadInfo[0].name}"',
        ${userId},
        ${squadId},
        'squad',
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Membro removido com sucesso"
    });
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}