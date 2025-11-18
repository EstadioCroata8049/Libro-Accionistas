"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import bcrypt from "bcryptjs";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";

import { supabase } from "@/lib/supabaseClient";

export default function CreateUserPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

      const { error: insertError } = await supabase.from("users").insert({
        username: usernameTrimmed,
        password: hash,
      });

      if (insertError) {
        setError("Error al crear el usuario");
        return;
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
    </div>
  );
}
