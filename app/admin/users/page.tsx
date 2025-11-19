"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import bcrypt from "bcryptjs";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";

import { supabase } from "@/lib/supabaseClient";

export default function CreateUserPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deleteUser, setDeleteUser] = useState<any | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, username")
        .order("username", { ascending: true });

      if (!error && data) {
        setUsers(data);
      }

      setLoadingUsers(false);
    };

    loadUsers();
  }, []);

  const openDeleteModal = (user: any) => {
    setDeleteUser(user);
    setIsDeleteOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword("");
    setIsEditOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteUser) return;

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", deleteUser.id);

    if (error) {
      setError("Error al eliminar el usuario");
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
    setSuccess(`Usuario "${deleteUser.username}" eliminado`);
    setDeleteUser(null);
    setIsDeleteOpen(false);
  };

  const handleConfirmEditUser = async () => {
    if (!editingUser) return;

    const newUsername = editUsername.trim();
    if (!newUsername) {
      setError("El usuario no puede quedar vacío");
      return;
    }

    const updatePayload: any = { username: newUsername };

    const newPassword = editPassword.trim();
    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 10);
      updatePayload.password = hash;
    }

    const { error } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", editingUser.id);

    if (error) {
      setError("Error al actualizar el usuario");
      return;
    }

    setUsers((prev) =>
      prev
        .map((u) => (u.id === editingUser.id ? { ...u, username: newUsername } : u))
        .sort((a, b) =>
          a.username.localeCompare(b.username, "es", { sensitivity: "base" }),
        ),
    );

    setSuccess("Usuario actualizado con éxito");
    setIsEditOpen(false);
    setEditingUser(null);
    setEditPassword("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const usernameTrimmed = username.trim();
    const passwordTrimmed = password.trim();

    if (!usernameTrimmed || !passwordTrimmed) {
      setError("Usuario y contraseña son obligatorios");
      return;
    }

    try {
      setLoading(true);

      const hash = await bcrypt.hash(passwordTrimmed, 10);

      const { data: inserted, error: insertError } = await supabase
        .from("users")
        .insert({
          username: usernameTrimmed,
          password: hash,
        })
        .select("id, username")
        .single();

      if (insertError) {
        setError("Error al crear el usuario");
        return;
      }

      if (inserted) {
        setUsers((prev) =>
          [...prev, inserted].sort((a, b) =>
            a.username.localeCompare(b.username, "es", { sensitivity: "base" }),
          ),
        );
      }

      setSuccess("Usuario creado con éxito");
      setUsername("");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-700 px-4">
      <Card className="w-full max-w-md rounded-3xl shadow-xl bg-white text-gray-900">
        <CardHeader className="pt-6 pb-3 px-6">
          <h1 className="text-lg font-semibold text-gray-900">Crear usuario</h1>
        </CardHeader>
        <CardBody className="px-6 pb-4">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              type="text"
              label="Usuario"
              variant="bordered"
              radius="sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              classNames={{
                inputWrapper: "bg-white border-gray-200",
              }}
            />
            <Input
              type={showPassword ? "text" : "password"}
              label="Contraseña"
              variant="bordered"
              radius="sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              classNames={{
                inputWrapper: "bg-white border-gray-200",
              }}
              endContent={
                <button
                  type="button"
                  className="text-xs font-semibold text-gray-500 cursor-pointer"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              }
            />
            <Button
              type="submit"
              radius="sm"
              className="mt-2 bg-blue-600 font-semibold text-white"
              fullWidth
              isLoading={loading}
            >
              Crear usuario
            </Button>
            {error && (
              <p className="mt-1 text-center text-xs text-red-600">{error}</p>
            )}
            {success && (
              <p className="mt-1 text-center text-xs text-emerald-600">{success}</p>
            )}
          </form>
          <div className="mt-5 border-t border-dashed border-gray-200 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">
              Usuarios existentes
            </p>
            {loadingUsers ? (
              <p className="text-xs text-gray-400">Cargando usuarios...</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-gray-400">No hay usuarios registrados.</p>
            ) : (
              <ul className="space-y-1 text-xs text-gray-800 max-h-40 overflow-y-auto">
                {users.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between rounded border border-gray-100 px-2 py-1 gap-2"
                  >
                    <span className="font-medium truncate">{u.username}</span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        className="rounded bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-600"
                        onClick={() => openEditModal(u)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-red-600"
                        onClick={() => openDeleteModal(u)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardBody>
        <CardFooter className="px-6 pb-5 flex justify-between text-xs text-gray-500">
          <button
            type="button"
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => router.push("/dashboard")}
          >
            Volver al dashboard
          </button>
        </CardFooter>
      </Card>

      {/* Modal editar usuario */}
      <Modal isOpen={isEditOpen} onOpenChange={setIsEditOpen}>
        <ModalContent className="bg-white text-gray-900">
          {(onClose) => (
            <>
              <ModalHeader className="text-sm font-semibold">
                Editar usuario
              </ModalHeader>
              <ModalBody className="space-y-3">
                <Input
                  type="text"
                  label="Usuario"
                  variant="bordered"
                  radius="sm"
                  value={editUsername}
                  onValueChange={setEditUsername}
                />
                <Input
                  type="password"
                  label="Nueva contraseña"
                  description="Déjalo en blanco para mantener la actual"
                  variant="bordered"
                  radius="sm"
                  value={editPassword}
                  onValueChange={setEditPassword}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  radius="sm"
                  onPress={() => {
                    setIsEditOpen(false);
                    setEditingUser(null);
                    setEditPassword("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  radius="sm"
                  onPress={async () => {
                    await handleConfirmEditUser();
                    onClose();
                  }}
                >
                  Guardar cambios
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal eliminar usuario */}
      <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <ModalContent className="bg-white text-gray-900">
          {(onClose) => (
            <>
              <ModalHeader className="text-sm font-semibold text-red-600">
                Eliminar usuario
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-gray-700">
                  ¿Seguro que deseas eliminar al usuario
                  {" "}
                  <span className="font-semibold">
                    {deleteUser?.username}
                  </span>
                  ? Esta acción es permanente.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  radius="sm"
                  onPress={() => {
                    setIsDeleteOpen(false);
                    setDeleteUser(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  color="danger"
                  radius="sm"
                  onPress={async () => {
                    await handleConfirmDeleteUser();
                    onClose();
                  }}
                >
                  Eliminar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
