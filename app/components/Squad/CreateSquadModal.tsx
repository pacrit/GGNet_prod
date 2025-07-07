"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface CreateSquadModalProps {
  onClose: () => void;
  onCreated: (squad: any) => void;
}

interface Category {
  id: number;
  name: string;
}

export default function CreateSquadModal({ onClose, onCreated }: CreateSquadModalProps) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState(6);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Carregar categorias ao abrir o modal
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      } else {
        console.error("Erro ao carregar categorias:", data.error);
      }
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleGameToggle = (game: string) => {
    setSelectedGames(prev => 
      prev.includes(game) 
        ? prev.filter(g => g !== game)
        : [...prev, game]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/squads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          maxMembers,
          mainGames: selectedGames,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar squad");
      }

      onCreated(data.squad);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao criar squad");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="squad-modal-overlay">
      <div className="squad-modal-content">
        <div className="squad-modal-header">
          <h2>🎮 Criar Novo Squad</h2>
          <button className="squad-modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="create-squad-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="squad-form-group">
            <label htmlFor="name">Nome do Squad *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Equipe dos Campeões"
              required
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className="squad-form-group">
            <label htmlFor="description">Descrição</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conte um pouco sobre o squad..."
              disabled={loading}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="squad-form-group">
            <label htmlFor="maxMembers">Máximo de Membros</label>
            <select
              id="maxMembers"
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              disabled={loading}
            >
              {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(num => (
                <option key={num} value={num}>{num} membros</option>
              ))}
            </select>
          </div>

          <div className="squad-form-group">
            <label>Categorias de Jogos</label>
            {categoriesLoading ? (
              <div className="squad-loading-categories">
                <div className="loading-spinner"></div>
                <p>Carregando categorias...</p>
              </div>
            ) : (
              <div className="squad-games-grid">
                {categories.map(category => (
                  <button
                    key={category.id}
                    type="button"
                    className={`squad-game-toggle ${selectedGames.includes(category.name) ? 'selected' : ''}`}
                    onClick={() => handleGameToggle(category.name)}
                    disabled={loading}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="squad-modal-actions">
            <button
              type="button"
              className="squad-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="squad-btn-primary"
              disabled={loading || !name.trim()}
            >
              {loading ? "Criando..." : "Criar Squad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}