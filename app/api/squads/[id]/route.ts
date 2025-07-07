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

// GET - Detalhes do squad
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
    
    // Log para debug
    console.log("Debug - ID recebido:", id, "tipo:", typeof id);
    
    const squadId = parseInt(id);
    
    console.log("Debug - squadId após parseInt:", squadId, "isNaN:", isNaN(squadId));

    // Validar se o squadId é um número válido
    if (isNaN(squadId) || squadId <= 0) {
      console.log("Debug - ID inválido:", { id, squadId, isNaN: isNaN(squadId) });
      return NextResponse.json({ error: "ID do squad inválido" }, { status: 400 });
    }

    // Verificar se o usuário é membro do squad
    const memberCheck = await sql`
      SELECT role FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND is_active = true
    `;

    if (!memberCheck.length) {
      return NextResponse.json({ error: "Você não tem acesso a este squad" }, { status: 403 });
    }

    // Buscar detalhes do squad
    const squadDetails = await sql`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.leader_id,
        s.max_members,
        s.main_games,
        s.created_at,
        u.display_name as leader_name,
        u.avatar_url as leader_avatar,
        COUNT(sm.id) as member_count,
        CASE WHEN s.leader_id = ${userId} THEN true ELSE false END as is_leader
      FROM squads s
      JOIN users u ON s.leader_id = u.id
      LEFT JOIN squad_members sm ON s.id = sm.squad_id AND sm.is_active = true
      WHERE s.id = ${squadId}
      GROUP BY s.id, s.name, s.description, s.leader_id, s.max_members, s.main_games, s.created_at, u.display_name, u.avatar_url
    `;

    if (!squadDetails.length) {
      return NextResponse.json({ error: "Squad não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      squad: squadDetails[0],
      userRole: memberCheck[0].role,
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes do squad:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE - Sair do squad
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Validar se o squadId é um número válido
    if (isNaN(squadId) || squadId <= 0) {
      return NextResponse.json({ error: "ID do squad inválido" }, { status: 400 });
    }

    // Verificar se é o líder
    const leaderCheck = await sql`
      SELECT role FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND role = 'leader'
    `;

    if (leaderCheck.length) {
      return NextResponse.json({ error: "Líderes não podem sair do squad. Transfira a liderança primeiro." }, { status: 400 });
    }

    // Remover do squad
    await sql`
      UPDATE squad_members 
      SET is_active = false 
      WHERE squad_id = ${squadId} AND user_id = ${userId}
    `;

    return NextResponse.json({
      success: true,
      message: "Você saiu do squad",
    });
  } catch (error) {
    console.error("Erro ao sair do squad:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}