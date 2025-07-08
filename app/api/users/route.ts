import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Função auxiliar para verificar token
function verifyToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

// GET - Buscar usuários
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
    const payload = verifyToken(token);

    if (!payload) {
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

    const currentUserId = payload.userId;
    const search = request.nextUrl.searchParams.get("search")?.trim();

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
}

// PATCH - Atualizar perfil do usuário
export async function PATCH(request: NextRequest) {
  try {
    console.log("🔄 Atualizando perfil...");

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
    const { 
      display_name, 
      avatar_url, 
      current_password, 
      new_password 
    } = await request.json();

    // Validações
    if (!display_name || display_name.trim().length < 2) {
      return NextResponse.json({ 
        error: "Nome deve ter pelo menos 2 caracteres" 
      }, { status: 400 });
    }

    if (display_name.length > 50) {
      return NextResponse.json({ 
        error: "Nome deve ter no máximo 50 caracteres" 
      }, { status: 400 });
    }

    // Conectar ao banco
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);

    // Se está alterando senha, validar senha atual
    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ 
          error: "Senha atual é obrigatória para alterar senha" 
        }, { status: 400 });
      }

      if (new_password.length < 6) {
        return NextResponse.json({ 
          error: "Nova senha deve ter pelo menos 6 caracteres" 
        }, { status: 400 });
      }

      // Verificar senha atual
      const user = await sql`
        SELECT password_hash FROM users WHERE id = ${userId}
      `;

      if (user.length === 0) {
        return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
      }

      const isValidPassword = await bcrypt.compare(current_password, user[0].password_hash);
      if (!isValidPassword) {
        return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
      }

      // Hash da nova senha
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

      // Atualizar com nova senha
      await sql`
        UPDATE users 
        SET 
          display_name = ${display_name.trim()},
          avatar_url = ${avatar_url || null},
          password_hash = ${newPasswordHash},
          updated_at = NOW()
        WHERE id = ${userId}
      `;
    } else {
      // Atualizar sem senha
      await sql`
        UPDATE users 
        SET 
          display_name = ${display_name.trim()},
          avatar_url = ${avatar_url || null},
          updated_at = NOW()
        WHERE id = ${userId}
      `;
    }

    // Buscar dados atualizados
    const updatedUser = await sql`
      SELECT id, email, display_name, avatar_url, created_at
      FROM users
      WHERE id = ${userId}
    `;

    return NextResponse.json({
      success: true,
      message: "Perfil atualizado com sucesso",
      user: {
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        displayName: updatedUser[0].display_name,
        avatarUrl: updatedUser[0].avatar_url,
        createdAt: updatedUser[0].created_at
      }
    });

  } catch (error) {
    console.error("❌ Erro ao atualizar perfil:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE - Excluir conta do usuário
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ Excluindo conta...");

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
    const { password, confirmation } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Senha é obrigatória" }, { status: 400 });
    }

    // Conectar ao banco
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);

    // Buscar usuário
    const user = await sql`
      SELECT display_name, password_hash FROM users WHERE id = ${userId}
    `;

    if (user.length === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Verificar confirmação
    const expectedConfirmation = `EXCLUIR ${user[0].display_name.toUpperCase()}`;
    if (confirmation !== expectedConfirmation) {
      return NextResponse.json({ 
        error: "Texto de confirmação incorreto" 
      }, { status: 400 });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user[0].password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 400 });
    }

    // Excluir tudo em ordem (devido às foreign keys)
    await sql`BEGIN`;

    try {
      console.log("🗑️ Excluindo dados do usuário:", userId);
      
      // 1. Excluir comentários
      await sql`DELETE FROM comments WHERE user_id = ${userId}`;
      
      // 2. Excluir likes
      await sql`DELETE FROM post_likes WHERE user_id = ${userId}`;
      
      // 3. Excluir notificações
      await sql`DELETE FROM notifications WHERE user_id = ${userId} OR from_user_id = ${userId}`;
      
      // 4. Excluir amizades
      await sql`DELETE FROM friendships WHERE user1_id = ${userId} OR user2_id = ${userId}`;
      
      // 5. Excluir posts
      await sql`DELETE FROM posts WHERE user_id = ${userId}`;
      
      // 6. Excluir usuário
      await sql`DELETE FROM users WHERE id = ${userId}`;

      await sql`COMMIT`;

      console.log("✅ Conta excluída com sucesso:", userId);

      return NextResponse.json({
        success: true,
        message: "Conta excluída com sucesso"
      });

    } catch (deleteError) {
      await sql`ROLLBACK`;
      console.error("❌ Erro na exclusão:", deleteError);
      throw deleteError;
    }

  } catch (error) {
    console.error("❌ Erro ao excluir conta:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
