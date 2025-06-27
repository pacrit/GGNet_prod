"use client"

import { createContext, useContext, useState, useEffect } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, googleProvider, db } from "../firebase/config"

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Cadastro com email e senha
  async function signup(email, password, displayName) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)

      // Atualizar perfil com nome
      await updateProfile(result.user, {
        displayName: displayName,
      })

      // Salvar dados do usuário no Firestore
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        email: email,
        displayName: displayName,
        createdAt: new Date(),
        lastLogin: new Date(),
      })

      return result
    } catch (error) {
      console.error("Erro no cadastro:", error)
      throw error
    }
  }

  // Login com email e senha
  async function login(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)

      // Atualizar último login
      await setDoc(
        doc(db, "users", result.user.uid),
        {
          lastLogin: new Date(),
        },
        { merge: true },
      )

      return result
    } catch (error) {
      console.error("Erro no login:", error)
      throw error
    }
  }

  // Login com Google
  async function loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider)

      // Verificar se é o primeiro login do usuário
      const userDoc = await getDoc(doc(db, "users", result.user.uid))

      if (!userDoc.exists()) {
        // Primeiro login - criar documento do usuário
        await setDoc(doc(db, "users", result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: new Date(),
          lastLogin: new Date(),
        })
      } else {
        // Atualizar último login
        await setDoc(
          doc(db, "users", result.user.uid),
          {
            lastLogin: new Date(),
          },
          { merge: true },
        )
      }

      return result
    } catch (error) {
      console.error("Erro no login com Google:", error)
      throw error
    }
  }

  // Logout
  function logout() {
    return signOut(auth)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}
