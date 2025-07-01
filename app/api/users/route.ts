import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🚀 Buscando usuários...");

    // Verificar token de autorização
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Token de autorização necessário" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verificar token (versão simplificada)
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return NextResponse.json({ error: "Token inválido" }, { status: 401 });
      }

      const payload = JSON.parse(atob(parts[1]));
      if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
        return NextResponse.json({ error: "Token expirado" }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
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
    

    // Buscar usuários
    try {
      const parts = token.split(".");
    if (parts.length !== 3) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: "Token expirado" }, { status: 401 });
    }
    const currentUserId = payload.userId;
      const users = await sql`
        SELECT id, email, display_name, avatar_url, created_at 
        FROM users 
        WHERE id <> ${currentUserId}
        ORDER BY created_at DESC 
        LIMIT 50
      `;

      return NextResponse.json({
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at,
        })),
      });
    } catch (error) {
      console.error("❌ Erro ao buscar usuários:", error);
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Erro geral:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
