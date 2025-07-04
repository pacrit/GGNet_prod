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

// Função para criar notificação
async function createNotification(userId: number, type: string, message: string, link: string) {
  try {
    await sql`
      INSERT INTO notifications (user_id, type, message, link)
      VALUES (${userId}, ${type}, ${message}, ${link})
    `;
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const postId = parseInt(params.id);
  const userId = payload.userId;

  try {
    // Buscar informações do post e do autor
    const postInfo = await sql`
      SELECT p.user_id as post_owner_id, p.content, u.display_name as liker_name
      FROM posts p
      JOIN users u ON u.id = ${userId}
      WHERE p.id = ${postId}
    `;

    if (!postInfo[0]) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
    }

    const { post_owner_id, content, liker_name } = postInfo[0];

    // Verificar se já curtiu
    const existingLike = await sql`
      SELECT id FROM post_likes WHERE post_id = ${postId} AND user_id = ${userId}
    `;

    if (existingLike.length > 0) {
      // Remover like
      await sql`DELETE FROM post_likes WHERE post_id = ${postId} AND user_id = ${userId}`;
    } else {
      // Adicionar like
      await sql`INSERT INTO post_likes (post_id, user_id) VALUES (${postId}, ${userId})`;
      
      // Criar notificação apenas se não for o próprio usuário curtindo seu post
      if (post_owner_id !== userId) {
        const postPreview = content.length > 50 ? content.substring(0, 50) + "..." : content;
        await createNotification(
          post_owner_id,
          "like",
          `${liker_name} curtiu seu post: "${postPreview}"`,
          `/profile?postId=${postId}`
        );
      }
    }

    // Contar likes atuais
    const likesCount = await sql`
      SELECT COUNT(*) as count FROM post_likes WHERE post_id = ${postId}
    `;

    const userLiked = await sql`
      SELECT id FROM post_likes WHERE post_id = ${postId} AND user_id = ${userId}
    `;

    return NextResponse.json({
      success: true,
      likes_count: parseInt(likesCount[0].count),
      user_liked: userLiked.length > 0,
    });
  } catch (error) {
    console.error("Erro ao curtir post:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}