"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"

interface CreatePostProps {
  onPostCreated: (post: any) => void
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { currentUser, token } = useAuth()
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const maxLength = 500

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      setError("Digite algo para postar")
      return
    }

    if (content.length > maxLength) {
      setError(`Post muito longo. Máximo ${maxLength} caracteres.`)
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao criar post")
      }

      const data = await response.json()
      onPostCreated(data.post)
      setContent("")
    } catch (error) {
      console.error("Erro ao criar post:", error)
      setError(error instanceof Error ? error.message : "Erro ao criar post")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="create-post-card">
      <div className="create-post-header">
        <div className="user-avatar">
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl || "/placeholder.svg"} alt={currentUser.displayName} />
          ) : (
            <div className="avatar-placeholder">{currentUser?.displayName?.charAt(0).toUpperCase()}</div>
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
        />

        <div className="post-actions">
          <div className="char-counter">
            <span className={content.length > maxLength ? "over-limit" : ""}>
              {content.length}/{maxLength}
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim() || content.length > maxLength}
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
  )
}
