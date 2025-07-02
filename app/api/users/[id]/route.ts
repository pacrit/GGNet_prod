import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verificar token de autorização
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Token de autorização necessário" },
      { status: 401 }
    );
  }

  // Conectar ao banco
  let sql;
  try {
    const { neon } = await import("@neondatabase/serverless");
    sql = neon(process.env.DATABASE_URL!);
  } catch (error) {
    console.error("❌ Erro na conexão com banco:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
  const userId = params.id;

  const result = await sql`
    SELECT id, email, display_name, avatar_url, created_at
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  if (!result[0]) {
    return NextResponse.json(
      { error: "Usuário não encontrado" },
      { status: 404 }
    );
  }

  const user = result[0];

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
    },
  });
}
