"use client";

import type React from "react";

import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { CameraOutlined } from "@ant-design/icons";
import { Button, FloatButton } from "antd";

interface CreatePostProps {
  onPostCreated: (post: any) => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { currentUser, token } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const maxLength = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !imageFile) {
      setError("Digite algo ou selecione uma imagem para postar");
      return;
    }

    if (content.length > maxLength) {
      setError(`Post muito longo. Máximo ${maxLength} caracteres.`);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadToCloudinary(imageFile);
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          image_url: imageUrl, // envie a url da imagem
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar post");
      }

      const data = await response.json();
      onPostCreated(data.post);
      setContent("");
    } catch (error) {
      console.error("Erro ao criar post:", error);
      setError(error instanceof Error ? error.message : "Erro ao criar post");
    } finally {
      setIsSubmitting(false);
    }
  };

  async function uploadToCloudinary(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "preset_publico"); // mesmo preset do cadastro

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    return data.secure_url;
  }

  return (
    <div className="create-post-card">
      <div className="create-post-header">
        <div className="user-avatar">
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl || "/placeholder.svg"}
              alt={currentUser.displayName}
            />
          ) : (
            <div className="avatar-placeholder">
              {currentUser?.displayName?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="user-info">
          <h4>{currentUser?.displayName}</h4>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="create-post-form">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que você está pensando?"
          className="post-textarea"
          rows={3}
          disabled={isSubmitting}
          style={{ width: "100%", resize: "vertical" }}
        />
        {imagePreview ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src={imagePreview}
              alt="Prévia da imagem"
              className="avatar-preview"
            />
            <Button
              size="small"
              danger
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
                // Limpa o input file também, se quiser
                const input = document.getElementById(
                  "post-image"
                ) as HTMLInputElement;
                if (input) input.value = "";
              }}
              style={{ marginLeft: 8 }}
            >
              Remover
            </Button>
          </span>
        ) : (
          <span></span>
        )}
        <input
          type="file"
          id="post-image"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setImageFile(file);
            setImagePreview(file ? URL.createObjectURL(file) : null);
          }}
          disabled={isSubmitting}
        />

        <div className="post-actions">
          <div className="char-counter">
            <span className={content.length > maxLength ? "over-limit" : ""}>
              {content.length}/{maxLength}
            </span>
          </div>

          <Button
            disabled={isSubmitting}
            variant="outlined"
            onClick={() => document.getElementById("post-image")?.click()}
          >
            <CameraOutlined />
          </Button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              (!content.trim() && !imageFile) || // <-- permite um ou outro
              content.length > maxLength
            }
            className="post-btn"
          >
            {isSubmitting ? "Postando..." : "Postar"}
          </button>
        </div>

        {error && (
          <div className="post-error">
            <p>{error}</p>
          </div>
        )}
      </form>
    </div>
  );
}
