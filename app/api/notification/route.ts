import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Função para verificar token JWT
function verifyToken(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch (error) {
    return null;
  }
}

// Listar notificações do usuário logado
export async function GET(request: NextRequest) {
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

  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const notifications = await sql`
    SELECT id, type, message, link, is_read, created_at
    FROM notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 20
  `;
  return NextResponse.json({ notifications });
}

// Marcar como lida
export async function PATCH(request: NextRequest) {
  const { id } = await request.json();
  await sql`UPDATE notifications SET is_read = TRUE WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}

// Criar notificação
export async function POST(request: NextRequest) {
  const { user_id, type, message, link } = await request.json();
  const result = await sql`
    INSERT INTO notifications (user_id, type, message, link)
    VALUES (${user_id}, ${type}, ${message}, ${link})
    RETURNING id
  `;
  return NextResponse.json({ id: result[0].id });
}
