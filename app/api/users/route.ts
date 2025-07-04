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
      // PEGAR O PARÂMETRO DE BUSCA
      const search = request.nextUrl.searchParams.get("search")?.trim();

      // Defina o tipo esperado para os usuários
      type UserDb = {
        id: number;
        email: string;
        display_name: string;
        avatar_url: string | null;
        created_at: string;
      };

      let users: UserDb[];

      if (search && search.length > 1) {
        const result = await sql`
          SELECT id, email, display_name, avatar_url, created_at 
          FROM users 
          WHERE id <> ${currentUserId}
            AND display_name ILIKE ${"%" + search + "%"}
          ORDER BY created_at DESC 
          LIMIT 20
        `;
        users = result.map((row: any) => ({
          id: row.id,
          email: row.email,
          display_name: row.display_name,
          avatar_url: row.avatar_url,
          created_at: row.created_at,
        }));
      } else {
        users = [];
      }

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
