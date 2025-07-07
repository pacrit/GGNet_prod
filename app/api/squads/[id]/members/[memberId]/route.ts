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

// PATCH - Alterar cargo do membro
export async function PATCH(
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
    const { role } = await request.json();

    const squadId = parseInt(id);
    const memberIdNum = parseInt(memberId);

    if (isNaN(squadId) || isNaN(memberIdNum)) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    // Validar o novo cargo
    if (!['member', 'moderator'].includes(role)) {
      return NextResponse.json({ error: "Cargo inválido" }, { status: 400 });
    }

    // Verificar se o usuário tem permissão para alterar cargos
    const userCheck = await sql`
      SELECT role FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND is_active = true
    `;

    if (!userCheck.length) {
      return NextResponse.json({ error: "Você não tem acesso a este squad" }, { status: 403 });
    }

    const userRole = userCheck[0].role;

    // Verificar se o membro existe
    const memberCheck = await sql`
      SELECT role, user_id FROM squad_members 
      WHERE squad_id = ${squadId} AND id = ${memberIdNum} AND is_active = true
    `;

    if (!memberCheck.length) {
      return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    }

    const currentMemberRole = memberCheck[0].role;
    const targetUserId = memberCheck[0].user_id;

    // Não pode alterar o próprio cargo
    if (targetUserId === userId) {
      return NextResponse.json({ error: "Você não pode alterar seu próprio cargo" }, { status: 400 });
    }

    // Verificar permissões
    if (userRole === "leader") {
      // Leader pode alterar qualquer cargo (exceto outros leaders)
      if (currentMemberRole === "leader") {
        return NextResponse.json({ error: "Não é possível alterar o cargo de outro líder" }, { status: 403 });
      }
    } else if (userRole === "moderator") {
      // Moderator pode apenas promover membros para moderador
      if (currentMemberRole !== "member" || role !== "moderator") {
        return NextResponse.json({ error: "Moderadores só podem promover membros para moderador" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Você não tem permissão para alterar cargos" }, { status: 403 });
    }

    // Alterar o cargo
    await sql`
      UPDATE squad_members 
      SET role = ${role}, updated_at = NOW()
      WHERE squad_id = ${squadId} AND id = ${memberIdNum}
    `;

    // Buscar informações para notificação
    const memberInfo = await sql`
      SELECT u.display_name, u.id as user_id
      FROM users u
      JOIN squad_members sm ON u.id = sm.user_id
      WHERE sm.id = ${memberIdNum}
    `;

    const squadInfo = await sql`
      SELECT name FROM squads WHERE id = ${squadId}
    `;

    // Criar notificação para o membro
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
        'role_changed',
        'Cargo alterado! 🎖️',
        'Seu cargo no squad "${squadInfo[0].name}" foi alterado para ${role === 'moderator' ? 'Moderador' : 'Membro'}',
        ${userId},
        ${squadId},
        'squad',
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      message: `Cargo alterado com sucesso para ${role === 'moderator' ? 'Moderador' : 'Membro'}`,
      newRole: role
    });
  } catch (error) {
    console.error("Erro ao alterar cargo:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}