import { NextRequest, NextResponse } from "next/server";

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
  const { fromUserId } = await request.json();

  if (!fromUserId) {
    return NextResponse.json({ error: "fromUserId é obrigatório" }, { status: 400 });
  }

  // Conectar ao banco
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  // Atualiza status para aceito
  await sql`
    UPDATE friends
    SET status = 'aceito'
    WHERE user_id = ${fromUserId}
      AND friend_id = ${currentUserId}
      AND status = 'pendente'
  `;

  return NextResponse.json({ success: true });
}