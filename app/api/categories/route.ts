import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// GET - Buscar categorias de jogos
export async function GET(request: NextRequest) {
  try {
    const categories = await sql`
      SELECT id, name FROM categories_game ORDER BY name
    `
    return NextResponse.json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar categorias:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}