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

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const currentUserId = payload.userId;
  const { fromUserId } = await request.json();

  try {
    // Aceitar o convite (atualizar status para 'accepted')
    await sql`
      UPDATE friends 
      SET status = 'accepted' 
      WHERE user_id = ${fromUserId} AND friend_id = ${currentUserId} AND status = 'pendente'
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao aceitar convite:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}