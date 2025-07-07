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

// GET - Buscar mensagens do chat
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

    // Validar squadId
    if (isNaN(squadId) || squadId <= 0) {
      return NextResponse.json({ error: "ID do squad inválido" }, { status: 400 });
    }

    // Verificar se o usuário é membro do squad
    const memberCheck = await sql`
      SELECT 1 FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND is_active = true
    `;

    if (!memberCheck.length) {
      return NextResponse.json({ error: "Você não tem acesso a este chat" }, { status: 403 });
    }

    // Buscar parâmetros de paginação
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const before = url.searchParams.get('before'); // Para paginação

    let query;
    if (before) {
      const beforeDate = new Date(before);
      query = sql`
        SELECT 
          sm.id,
          sm.message,
          sm.created_at,
          sm.user_id,
          u.display_name,
          u.avatar_url
        FROM squad_messages sm
        JOIN users u ON sm.user_id = u.id
        WHERE sm.squad_id = ${squadId} 
          AND sm.created_at < ${beforeDate.toISOString()}
        ORDER BY sm.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      query = sql`
        SELECT 
          sm.id,
          sm.message,
          sm.created_at,
          sm.user_id,
          u.display_name,
          u.avatar_url
        FROM squad_messages sm
        JOIN users u ON sm.user_id = u.id
        WHERE sm.squad_id = ${squadId} 
        ORDER BY sm.created_at DESC
        LIMIT ${limit}
      `;
    }

    const messages = await query;

    return NextResponse.json({
      success: true,
      messages: messages.reverse(), // Inverter para ordem cronológica
    });
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Enviar mensagem
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

    // Validar squadId
    if (isNaN(squadId) || squadId <= 0) {
      return NextResponse.json({ error: "ID do squad inválido" }, { status: 400 });
    }

    const { message } = await request.json();

    // Validar mensagem
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Mensagem não pode estar vazia" }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: "Mensagem muito longa (máximo 1000 caracteres)" }, { status: 400 });
    }

    // Verificar se o usuário é membro do squad
    const memberCheck = await sql`
      SELECT 1 FROM squad_members 
      WHERE squad_id = ${squadId} AND user_id = ${userId} AND is_active = true
    `;

    if (!memberCheck.length) {
      return NextResponse.json({ error: "Você não tem acesso a este chat" }, { status: 403 });
    }

    // Inserir mensagem
    const newMessage = await sql`
      INSERT INTO squad_messages (squad_id, user_id, message)
      VALUES (${squadId}, ${userId}, ${message.trim()})
      RETURNING id, message, created_at, user_id
    `;

    // Buscar dados do usuário para retornar
    const userInfo = await sql`
      SELECT display_name, avatar_url 
      FROM users 
      WHERE id = ${userId}
    `;

    const messageWithUser = {
      ...newMessage[0],
      display_name: userInfo[0].display_name,
      avatar_url: userInfo[0].avatar_url,
    };

    return NextResponse.json({
      success: true,
      message: messageWithUser,
    });
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}