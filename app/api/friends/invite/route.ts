import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token de autorização necessário" }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const parts = token.split(".");
  if (parts.length !== 3) return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  const payload = JSON.parse(atob(parts[1]));
  if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
    return NextResponse.json({ error: "Token expirado" }, { status: 401 });
  }
  const currentUserId = payload.userId;
  const { friendId } = await request.json();

  if (!friendId) {
    return NextResponse.json({ error: "friendId é obrigatório" }, { status: 400 });
  }

  // Conectar ao banco
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  // Insere convite pendente
  await sql`
    INSERT INTO friends (user_id, friend_id, status)
    VALUES (${currentUserId}, ${friendId}, 'pendente')
    ON CONFLICT DO NOTHING
  `;

  return NextResponse.json({ success: true });
}