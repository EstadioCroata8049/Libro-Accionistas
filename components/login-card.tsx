"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";

import { supabase } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";

export function LoginCard() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedInVisual, setLoggedInVisual] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setLoggedInVisual(false);

    const usernameTrimmed = username.trim();
    const passwordTrimmed = password.trim();

    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("id, username, password")
      .eq("username", usernameTrimmed)
      .maybeSingle();

    if (userError) {
      setError("Error al verificar credenciales");
      setLoading(false);
      return;
    }

    if (!userRecord || !userRecord.password) {
      setError("Usuario o contraseña incorrectos");
      setLoading(false);
      return;
    }

    const passwordOk = await bcrypt.compare(
      passwordTrimmed,
      userRecord.password,
    );

    if (!passwordOk) {
      setError("Usuario o contraseña incorrectos");
      setLoading(false);
      return;
    }

    // Marca de sesion muy simple basada en cookie legible en middleware
    document.cookie = "logged_in=1; path=/; max-age=86400"; // 1 dia
    // Guardar el username para auditoría
    document.cookie = `current_user=${encodeURIComponent(userRecord.username)}; path=/; max-age=86400`;

    // Cambia visualmente el botón a "Ingresado" y espera un instante
    setLoggedInVisual(true);
    setLoading(false);

    setTimeout(() => {
      router.push("/select-empresa");
    }, 300);
  };

  return (
    <Card className="w-full max-w-md rounded-3xl shadow-xl bg-white text-gray-900">
      <CardHeader className="flex flex-col items-center gap-2 pt-8 pb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600">
          <Image
            src="/estadio_croatalogo.png"
            alt="Logo Estadio Croata"
            width={64}
            height={64}
            className="h-14 w-14 object-contain"
            priority
          />
        </div>
        <div className="mt-2 flex flex-col items-center gap-0.5 text-center">
          <p className="text-xs font-semibold text-gray-500 tracking-[0.2em]">
            CLUB DEPORTIVO
          </p>
          <p className="text-base font-extrabold text-blue-700">
            ESTADIO CROATA
          </p>
          <p className="text-[11px] font-semibold text-blue-600 uppercase">
            Libro de accionistas
          </p>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-4 px-8 pb-4">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            type="text"
            radius="sm"
            variant="bordered"
            labelPlacement="outside"
            placeholder="Ingresa tu usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            classNames={{
              inputWrapper:
                "bg-white border-gray-200 data-[focus=true]:border-black",
              input: "text-black placeholder:text-gray-400",
            }}
          />
          <Input
            type={showPassword ? "text" : "password"}
            radius="sm"
            variant="bordered"
            labelPlacement="outside"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            classNames={{
              inputWrapper:
                "bg-white border-gray-200 data-[focus=true]:border-black",
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
          <div className="flex items-center justify-between text-sm">
            <Checkbox
              radius="sm"
              classNames={{
                label: "text-xs text-black",
                wrapper:
                  "border border-gray-300 bg-transparent group-data-[hover=true]:border-blue-500 group-data-[hover=true]:bg-blue-50",
                icon:
                  "bg-transparent group-data-[hover=true]:bg-blue-500 group-data-[selected=true]:bg-blue-600",
              }}
            >
              Recordarme
            </Checkbox>
          </div>
          <Button
            type="submit"
            radius="sm"
            className={`mt-2 font-semibold text-white ${
              loggedInVisual ? "bg-green-600" : "bg-red-600"
            }`}
            fullWidth
            isLoading={loading}
          >
            {loggedInVisual ? "INGRESADO" : "INGRESAR"}
          </Button>
          {error && (
            <p className="mt-1 text-center text-xs text-red-600">{error}</p>
          )}
        </form>
      </CardBody>
      <CardFooter className="flex flex-col items-center gap-1 pb-6 text-[11px] text-gray-400">
        <p>
          Para recuperación de contraseña contactar al administrador
        </p>
        <p className="text-[10px]">
          © 2025 Club Deportivo Estadio Croata
        </p>
      </CardFooter>
    </Card>
  );
}
