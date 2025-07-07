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

// GET - Listar squads do usuário
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

    // Buscar squads do usuário
    const squads = await sql`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.leader_id,
        s.max_members,
        s.main_games,
        s.created_at,
        COUNT(sm.id) as member_count,
        CASE WHEN s.leader_id = ${userId} THEN true ELSE false END as is_leader,
        true as is_member
      FROM squads s
      JOIN squad_members sm ON s.id = sm.squad_id
      WHERE s.id IN (
        SELECT squad_id FROM squad_members 
        WHERE user_id = ${userId} AND is_active = true
      )
      GROUP BY s.id, s.name, s.description, s.leader_id, s.max_members, s.main_games, s.created_at
      ORDER BY s.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      squads: squads,
    });
  } catch (error) {
    console.error("Erro ao buscar squads:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Criar novo squad
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
    const { name, description, maxMembers, mainGames } = await request.json();

    // Validações
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Nome muito longo (máximo 100 caracteres)" }, { status: 400 });
    }

    if (maxMembers && (maxMembers < 2 || maxMembers > 20)) {
      return NextResponse.json({ error: "Número de membros deve estar entre 2 e 20" }, { status: 400 });
    }

    // Criar o squad
    const newSquad = await sql`
      INSERT INTO squads (name, description, leader_id, max_members, main_games)
      VALUES (${name.trim()}, ${description || null}, ${userId}, ${maxMembers || 6}, ${mainGames || []})
      RETURNING id, name, description, leader_id, max_members, main_games, created_at
    `;

    // Adicionar o criador como membro
    await sql`
      INSERT INTO squad_members (squad_id, user_id, role)
      VALUES (${newSquad[0].id}, ${userId}, 'leader')
    `;

    return NextResponse.json({
      success: true,
      squad: {
        ...newSquad[0],
        member_count: 1,
        is_member: true,
        is_leader: true,
      },
    });
  } catch (error) {
    console.error("Erro ao criar squad:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}