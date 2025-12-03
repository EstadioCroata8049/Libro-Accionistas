"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/react";

import { supabase } from "@/lib/supabaseClient";

interface Empresa {
  id: string;
  nombre: string;
  rut: string | null;
}

export default function SelectEmpresaPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    const loadEmpresas = async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nombre, rut")
        .order("nombre", { ascending: true });

      if (error) {
        console.error("Error cargando empresas:", error);
        setLoading(false);
        return;
      }

      setEmpresas(data || []);
      setLoading(false);
    };

    loadEmpresas();
  }, []);

  const handleSelectEmpresa = (empresa: Empresa) => {
    setSelecting(empresa.id);
    
    // Guardar empresa seleccionada en cookies
    document.cookie = `current_empresa_id=${empresa.id}; path=/; max-age=86400`;
    document.cookie = `current_empresa_nombre=${encodeURIComponent(empresa.nombre)}; path=/; max-age=86400`;
    document.cookie = `current_empresa_rut=${encodeURIComponent(empresa.rut || "")}; path=/; max-age=86400`;
    
    // Redirigir al dashboard
    setTimeout(() => {
      router.push("/dashboard");
    }, 300);
  };

  const handleLogout = () => {
    document.cookie = "logged_in=; path=/; max-age=0";
    document.cookie = "current_user=; path=/; max-age=0";
    document.cookie = "current_empresa_id=; path=/; max-age=0";
    document.cookie = "current_empresa_nombre=; path=/; max-age=0";
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-red-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl rounded-3xl shadow-xl bg-white">
        <CardHeader className="flex flex-col items-center pt-8 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Seleccionar Empresa
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Elige la empresa con la que deseas trabajar
          </p>
        </CardHeader>
        <CardBody className="px-8 pb-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" color="primary" />
            </div>
          ) : empresas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay empresas disponibles</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {empresas.map((empresa) => (
                <Button
                  key={empresa.id}
                  className="w-full h-auto py-4 px-6 flex flex-row items-center justify-between bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-all"
                  variant="flat"
                  radius="lg"
                  isLoading={selecting === empresa.id}
                  onPress={() => handleSelectEmpresa(empresa)}
                >
                  <span className="text-lg font-semibold text-gray-900">
                    {empresa.nombre}
                  </span>
                  {empresa.rut && (
                    <span className="text-sm text-gray-500">
                      {empresa.rut}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
            <Button
              variant="light"
              color="danger"
              size="sm"
              onPress={handleLogout}
            >
              Cerrar sesión
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
