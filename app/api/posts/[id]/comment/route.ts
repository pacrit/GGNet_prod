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
  const { content } = await request.json();

  if (!content || content.trim() === "") {
    return NextResponse.json({ error: "Comentário não pode estar vazio" }, { status: 400 });
  }

  try {
    // Buscar informações do post e do usuário
    const postInfo = await sql`
      SELECT p.user_id as post_owner_id, p.content as post_content, u.display_name as commenter_name
      FROM posts p
      JOIN users u ON u.id = ${userId}
      WHERE p.id = ${postId}
    `;

    if (!postInfo[0]) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
    }

    const { post_owner_id, post_content, commenter_name } = postInfo[0];

    // Inserir comentário
    const result = await sql`
      INSERT INTO post_comments (post_id, user_id, content)
      VALUES (${postId}, ${userId}, ${content.trim()})
      RETURNING id, created_at
    `;

    // Buscar dados do usuário para retornar
    const userInfo = await sql`
      SELECT display_name, avatar_url FROM users WHERE id = ${userId}
    `;

    // Criar notificação apenas se não for o próprio usuário comentando em seu post
    if (post_owner_id !== userId) {
      const postPreview = post_content.length > 50 ? post_content.substring(0, 50) + "..." : post_content;
      const commentPreview = content.length > 30 ? content.substring(0, 30) + "..." : content;
      
      await createNotification(
        post_owner_id,
        "comment",
        `${commenter_name} comentou em seu post: "${commentPreview}"`,
        `/profile?postId=${postId}`
      );
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: result[0].id,
        user_id: userId,
        user_name: userInfo[0].display_name,
        user_avatar: userInfo[0].avatar_url,
        content: content.trim(),
        created_at: result[0].created_at,
      },
    });
  } catch (error) {
    console.error("Erro ao comentar:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}