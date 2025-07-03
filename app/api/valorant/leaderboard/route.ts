import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiKey = process.env.RIOT_API_KEY;
  // 1. Buscar conteúdo para pegar o actId
  const contentUrl = `https://br.api.riotgames.com/val/content/v1/contents?locale=pt-BR&api_key=${apiKey}`;
  const contentRes = await fetch(contentUrl);
  if (!contentRes.ok) {
    return NextResponse.json({ error: "Erro ao buscar conteúdo" }, { status: 500 });
  }
  const contentData = await contentRes.json();
  const acts = contentData.acts.filter((act: any) => act.type === "act" && act.isActive);
  const latestActId = acts.length > 0 ? acts[0].id : null;
  if (!latestActId) {
    return NextResponse.json({ error: "Nenhum act ativo encontrado" }, { status: 404 });
  }

  // 2. Buscar leaderboard
  const leaderboardUrl = `https://br.api.riotgames.com/val/ranked/v1/leaderboards/by-act/${latestActId}?size=200&startIndex=0&api_key=${apiKey}`;
  const leaderboardRes = await fetch(leaderboardUrl);
  if (!leaderboardRes.ok) {
    return NextResponse.json({ error: "Erro ao buscar leaderboard" }, { status: 500 });
  }
  const leaderboardData = await leaderboardRes.json();

  // 3. Retornar dados
  return NextResponse.json({
    actId: latestActId,
    leaderboard: leaderboardData.players,
  });
}