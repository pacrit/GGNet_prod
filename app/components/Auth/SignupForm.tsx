"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Select from "react-select";

interface SignupFormProps {
  onToggleForm: () => void;
}

export default function SignupForm({ onToggleForm }: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const { signup } = useAuth();

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories", {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Erro ao carregar categorias");
      }
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      setError("Não foi possível carregar as categorias");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Função para upload no Cloudinary
  async function uploadToCloudinary(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "preset_publico"); // crie esse preset no painel do Cloudinary

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    return data.secure_url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validações
    if (!displayName.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    if (!email.trim()) {
      setError("Email é obrigatório");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email inválido");
      return;
    }
    if (!password) {
      setError("Senha é obrigatória");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    try {
      setError("");
      setLoading(true);
      let avatarUrl = "";
      if (avatarFile) {
        avatarUrl = await uploadToCloudinary(avatarFile);
      }
      // Passe avatarUrl para o signup
      console.log("Iniciando cadastro para:", email);
      console.log("Avatar URL:", avatarUrl);
      console.log("Categorias selecionadas:", selectedCategories);
      console.log("Dados do usuário:", {
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        categories: selectedCategories,
        avatarUrl,
      });
      await signup(email, password, displayName, selectedCategories, avatarUrl);
    } catch (error: any) {
      setError(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form">
      <h2>Cadastro</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="displayName">Nome</label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            disabled={loading}
            placeholder="Seu nome completo"
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="seu@email.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Senha</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar Senha</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            placeholder="Digite a senha novamente"
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label htmlFor="categories">Categorias de Jogos que curte</label>
          <Select
            placeholder="Selecione as categorias de jogos"
            isMulti
            options={categories.map((cat) => ({
              value: cat.id,
              label: cat.name,
            }))}
            value={categories
              .filter((cat) => selectedCategories.includes(cat.id))
              .map((cat) => ({ value: cat.id, label: cat.name }))}
            onChange={(opts) =>
              setSelectedCategories(opts.map((opt) => opt.value))
            }
          />
        </div>

        <div className="form-group">
          <label htmlFor="avatar">Avatar (opcional)</label>
          <div className="avatar-upload-wrapper">
            <input
              type="file"
              id="avatar"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              disabled={loading}
            />
            <label htmlFor="avatar" className="avatar-upload-label">
              {avatarFile ? (
                <span>
                  <img
                    src={URL.createObjectURL(avatarFile)}
                    alt="Prévia do avatar"
                    className="avatar-preview"
                  />
                  Trocar imagem
                </span>
              ) : (
                <span>Escolher imagem</span>
              )}
            </label>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Criando conta..." : "Cadastrar"}
        </button>
      </form>

      <p className="toggle-form">
        Já tem uma conta?
        <button
          onClick={onToggleForm}
          className="link-button"
          type="button"
          disabled={loading}
        >
          Faça login
        </button>
      </p>
    </div>
  );
}
