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

  // Modificar query para incluir dados do remetente (para friend_request)
  const notifications = await sql`
    SELECT 
      n.id, 
      n.type, 
      n.message, 
      n.link, 
      n.is_read, 
      n.created_at,
      n.from_user_id,
      CASE 
        WHEN n.type = 'friend_request' THEN u.display_name
        ELSE NULL
      END as from_user_name,
      CASE 
        WHEN n.type = 'friend_request' THEN u.avatar_url
        ELSE NULL
      END as from_user_avatar
    FROM notifications n
    LEFT JOIN users u ON n.from_user_id = u.id
    WHERE n.user_id = ${userId}
    ORDER BY n.created_at DESC
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
  const { user_id, type, message, link, from_user_id } = await request.json();
  const result = await sql`
    INSERT INTO notifications (user_id, type, message, link, from_user_id)
    VALUES (${user_id}, ${type}, ${message}, ${link}, ${from_user_id})
    RETURNING id
  `;
  return NextResponse.json({ id: result[0].id });
}

// DELETE - Excluir notificação
export async function DELETE(request: NextRequest) {
  try {
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

    // Deletar todas as notificações do usuário
    const result = await sql`
      DELETE FROM notifications 
      WHERE user_id = ${userId}
    `;

    return NextResponse.json({
      success: true,
      message: "Todas as notificações foram removidas",
    });
  } catch (error) {
    console.error("Erro ao limpar notificações:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}