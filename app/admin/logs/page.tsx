"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Spinner, Pagination } from "@heroui/react";

import { supabase } from "@/lib/supabaseClient";

// Tamaño de página pequeño para minimizar egress
const PAGE_SIZE = 20;

interface ActivityLog {
  id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_name: string;
  changes: string | null;
  created_at: string;
}

const formatDate = (dateString: string): string => {
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

const getActionLabel = (action: string): string => {
  switch (action) {
    case "crear_accionista":
      return "Creó accionista";
    case "editar_accionista":
      return "Editó accionista";
    case "crear_traspaso":
      return "Creó traspaso";
    case "editar_traspaso":
      return "Editó traspaso";
    default:
      return action;
  }
};

const getEntityTypeLabel = (entityType: string): string => {
  switch (entityType) {
    case "accionista":
      return "Accionista";
    case "movimiento":
      return "Traspaso";
    default:
      return entityType;
  }
};

export default function ActivityLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currentEmpresaId, setCurrentEmpresaId] = useState<string | null>(null);
  const [currentEmpresaNombre, setCurrentEmpresaNombre] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Obtener empresa de cookies
  useEffect(() => {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "current_empresa_id" && value) {
        setCurrentEmpresaId(value);
      }
      if (name === "current_empresa_nombre" && value) {
        setCurrentEmpresaNombre(decodeURIComponent(value));
      }
    }
  }, []);

  // Cargar logs con paginación offset (eficiente con índice en created_at)
  const loadLogs = useCallback(async (page: number, empresaId: string | null) => {
    setLoading(true);
    setError(null);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Solo traer campos necesarios (no entity_id que no se muestra)
    // Usar count: 'exact' solo en primera carga para obtener total
    let query = supabase
      .from("activity_logs")
      .select("id, user_name, action, entity_type, entity_name, changes, created_at", 
        page === 1 ? { count: "exact" } : { count: "planned" }
      );
    
    // Filtrar por empresa si hay una seleccionada
    if (empresaId) {
      query = query.eq("empresa_id", empresaId);
    }
    
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error: fetchError, count } = await query;

    if (fetchError) {
      console.error("Error cargando logs:", fetchError);
      setError("Error al cargar los registros de actividad");
      setLoading(false);
      return;
    }

    // Solo actualizar total en primera página o si no lo tenemos
    if (count !== null && (page === 1 || totalCount === 0)) {
      setTotalCount(count);
    }

    setLogs(data || []);
    setLoading(false);
  }, [totalCount]);

  // Cargar primera página cuando tengamos empresa
  useEffect(() => {
    if (currentEmpresaId) {
      loadLogs(1, currentEmpresaId);
    }
  }, [currentEmpresaId, loadLogs]);

  // Cambiar de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadLogs(page, currentEmpresaId);
  };

  return (
    <div className="h-screen bg-red-700 p-4 md:p-6 overflow-hidden">
      <Card className="h-full rounded-3xl shadow-xl bg-white text-gray-900 flex flex-col overflow-hidden">
        <CardHeader className="pt-6 pb-3 px-6 flex flex-row items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Registro de Actividad
            </h1>
            <p className="text-xs text-gray-500">
              {currentEmpresaNombre ? `${currentEmpresaNombre} - ` : ""}Historial de creación de accionistas y traspasos
            </p>
          </div>
          <Button
            radius="sm"
            variant="shadow"
            color="primary"
            onPress={() => router.push("/dashboard")}
          >
            Volver al dashboard
          </Button>
        </CardHeader>
        <CardBody className="px-6 pb-4 flex-1 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-full py-8">
              <Spinner size="lg" color="primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm">{error}</p>
              <p className="text-gray-500 text-xs mt-2">
                Asegúrate de que la tabla &quot;activity_logs&quot; existe en Supabase
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                No hay registros de actividad aún
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Los registros aparecerán cuando se creen accionistas o traspasos
              </p>
            </div>
          ) : (
            <div className="h-full">
              <Table
                aria-label="Tabla de registros de actividad"
                classNames={{
                  wrapper:
                    "shadow-none border border-gray-200 rounded-lg bg-white",
                  th: "bg-gray-100 text-gray-800 text-[11px] font-semibold uppercase tracking-wide",
                  td: "text-sm text-gray-900",
                  tr: "odd:bg-white even:bg-gray-50 data-[hover=true]:bg-blue-50/60",
                  tbody: "divide-y divide-gray-200",
                }}
              >
                <TableHeader>
                  <TableColumn>FECHA</TableColumn>
                  <TableColumn>USUARIO</TableColumn>
                  <TableColumn>ACCIÓN</TableColumn>
                  <TableColumn>TIPO</TableColumn>
                  <TableColumn>DETALLE</TableColumn>
                  <TableColumn>CAMBIOS</TableColumn>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          {log.user_name}
                        </span>
                      </TableCell>
                      <TableCell>{getActionLabel(log.action)}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.entity_type === "accionista"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {getEntityTypeLabel(log.entity_type)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.entity_name}
                      </TableCell>
                      <TableCell className="max-w-md">
                        {log.changes ? (
                          <span className="text-xs text-gray-600" title={log.changes}>
                            {log.changes.length > 80 ? `${log.changes.substring(0, 80)}...` : log.changes}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardBody>
        <CardFooter className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 shrink-0 border-t border-gray-100">
          <span className="text-gray-500 text-sm">
            {totalCount > 0 ? (
              <>
                Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, totalCount)} de {totalCount} registros
              </>
            ) : (
              "Sin registros"
            )}
          </span>
          {totalPages > 1 && (
            <Pagination
              total={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              showControls
              siblings={2}
              boundaries={1}
              size="md"
              radius="lg"
              variant="light"
              classNames={{
                wrapper: "gap-0 bg-gray-100 rounded-xl p-1",
                item: "bg-transparent text-gray-600 font-medium min-w-9 h-9 hover:bg-gray-200 rounded-lg",
                cursor: "bg-blue-600 text-white font-semibold shadow-md rounded-xl",
                prev: "bg-transparent text-gray-400 hover:bg-gray-200 rounded-lg",
                next: "bg-transparent text-gray-400 hover:bg-gray-200 rounded-lg",
              }}
            />
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
