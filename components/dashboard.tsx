"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { DatePicker, ToastProvider, addToast } from "@heroui/react";
import { CalendarDate } from "@internationalized/date";

import { supabase } from "@/lib/supabaseClient";

const MOV_PAGE_SIZE = 50;

const emptyMovimiento = {
    fecha: "",
    transferencia: "",
    tituloAnulado: "",
    compradoA: "",
    vendidoA: "",
    tituloNuevoComprador: "",
    tituloNuevoVendedor: "",
    tituloEmitido: "",
    compras: "",
    ventas: "",
    saldo: "",
    observaciones: "",
};
const emptyAccionista = {
    nombre: "Sin accionista seleccionado",
    apellidos: "",
    rut: "-",
    nacionalidad: "-",
    direccion: "-",
    ciudad: "-",
    fono: "-",
    saldo: "0 acciones",
    firma: "",
};

export function Dashboard() {
    const router = useRouter();
    const [isTableMounted, setIsTableMounted] = useState(false);
    const [movimientos, setMovimientos] = useState<any[]>([]);
    const [movimientosTotal, setMovimientosTotal] = useState(0);
    const [movimientosPage, setMovimientosPage] = useState(0);
    const [accionista, setAccionista] = useState(emptyAccionista);
    const [accionistaId, setAccionistaId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isRegistroOpen, setIsRegistroOpen] = useState(false);
    const [registroDraft, setRegistroDraft] = useState({
        nombre: "",
        apellidos: "",
        rut: "",
        nacionalidad: "",
        direccion: "",
        ciudad: "",
        fono: "",
        saldo: "",
        firma: "",
    });
    const [isMovimientoOpen, setIsMovimientoOpen] = useState(false);
    const [newMovimiento, setNewMovimiento] = useState(emptyMovimiento);
    const [movimientoFecha, setMovimientoFecha] = useState<CalendarDate | null>(null);
    const [editingRowId, setEditingRowId] = useState<number | null>(null);
    const [editingMovimiento, setEditingMovimiento] = useState<any | null>(null);
    const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [registroSaving, setRegistroSaving] = useState(false);

    useEffect(() => {
        setIsTableMounted(true);

        const fetchData = async () => {
            // 1) Buscar accionista según searchTerm (RUT / nombre). Si no hay término, tomar el primero.
            let accionistasQuery = supabase.from("accionistas").select("*");

            const trimmed = searchTerm.trim();
            if (trimmed.length > 0) {
                accionistasQuery = accionistasQuery.or(
                    `rut.ilike.%${trimmed}%,nombre.ilike.%${trimmed}%,apellidos.ilike.%${trimmed}%`,
                );
            }

            const { data: accionistas, error } = await accionistasQuery
                .order("nombre", { ascending: true })
                .limit(1);

            if (!error && accionistas && accionistas.length > 0) {
                const a: any = accionistas[0];

                setAccionista({
                    nombre: a.nombre ?? "",
                    apellidos: a.apellidos ?? "",
                    rut: a.rut ?? "",
                    nacionalidad: a.nacionalidad ?? "",
                    direccion: a.direccion ?? "",
                    ciudad: a.ciudad ?? "",
                    fono: a.fono ?? "",
                    saldo:
                        a.saldo_acciones != null
                            ? `${a.saldo_acciones} acciones`
                            : "0 acciones",
                    firma: a.firma ?? "",
                });

                setAccionistaId(a.id ?? null);

                // 2) Paginación de movimientos para ese accionista
                const from = movimientosPage * MOV_PAGE_SIZE;
                const to = from + MOV_PAGE_SIZE - 1;

                const { data: movs, error: movsError, count } = await supabase
                    .from("movimientos")
                    .select("*", { count: "exact" })
                    .eq("accionista_id", a.id)
                    .order("fecha_transferencia", { ascending: true })
                    .range(from, to);

                if (movsError) {
                    console.error("Error loading movimientos:", movsError);
                    console.log("Supabase movimientos error details:", {
                        message: (movsError as any).message,
                        details: (movsError as any).details,
                        hint: (movsError as any).hint,
                        code: (movsError as any).code,
                    });
                }

                if (!movsError && movs) {
                    const mapped = movs.map((m: any, index: number) => ({
                        id: m.id,
                        displayId: from + index + 1,
                        fecha: m.fecha_transferencia
                            ? (() => {
                                  const d = new Date(m.fecha_transferencia);
                                  const dd = String(d.getDate()).padStart(2, "0");
                                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                                  const yyyy = d.getFullYear();
                                  return `${dd} - ${mm} - ${yyyy}`;
                              })()
                            : "-",
                        transferencia: m.numero_transferencia ?? "-",
                        tituloAnulado: m.titulo_inutilizado ?? "-",
                        compradoA: m.comprado_a ?? "-",
                        vendidoA: m.vendido_a ?? "-",
                        tituloNuevoComprador: m.titulo_nuevo_comprador ?? "-",
                        tituloNuevoVendedor: m.titulo_nuevo_vendedor ?? "-",
                        compras:
                            m.compras != null && m.compras !== undefined
                                ? String(m.compras)
                                : "-",
                        ventas:
                            m.ventas != null && m.ventas !== undefined
                                ? String(m.ventas)
                                : "-",
                        saldo:
                            m.saldo != null && m.saldo !== undefined
                                ? String(m.saldo)
                                : "-",
                        observaciones: m.observaciones ?? "-",
                        tituloEmitido: m.numero_titulo_emitido ?? "-",
                    }));
                    setMovimientos(mapped);
                    setMovimientosTotal(count ?? mapped.length);
                } else {
                    setMovimientos([]);
                    setMovimientosTotal(0);
                }
            } else {
                setAccionista(emptyAccionista);
                setMovimientos([]);
                setMovimientosTotal(0);
            }
        };

        fetchData();
    }, [searchTerm, movimientosPage]);

    const handleOpenCreateRegistro = () => {
        setRegistroDraft({
            nombre: "",
            apellidos: "",
            rut: "",
            nacionalidad: "",
            direccion: "",
            ciudad: "",
            fono: "",
            saldo: "",
            firma: "",
        });
        setIsRegistroOpen(true);
    };

    const handleSaveRegistro = async () => {
        try {
            setRegistroSaving(true);

            const saldoNumber = (() => {
                if (!registroDraft.saldo) return null;
                const match = registroDraft.saldo.match(/\d+/);
                return match ? Number(match[0]) : null;
            })();

            // Construir payload dinámicamente para no enviar campos problemáticos cuando están vacíos
            const payload: any = {
                nombre: registroDraft.nombre || null,
                apellidos: registroDraft.apellidos || null,
                nacionalidad: registroDraft.nacionalidad || null,
                direccion: registroDraft.direccion || null,
                ciudad: registroDraft.ciudad || null,
                fono: registroDraft.fono || null,
                saldo_acciones: saldoNumber,
                firma: registroDraft.firma || null,
            };

            if (registroDraft.rut && registroDraft.rut.trim().length > 0) {
                payload.rut = registroDraft.rut.trim();
            }

            const upsertOptions =
                registroDraft.rut && registroDraft.rut.trim().length > 0
                    ? { onConflict: "rut" as const }
                    : {};

            const { data, error } = await supabase
                .from("accionistas")
                .upsert(payload, upsertOptions)
                .select("*")
                .single();

            if (error || !data) {
                console.error("Error Supabase accionistas:", error);
                addToast({
                    title: "Error al guardar el registro",
                    description: "Revisa los datos e intenta nuevamente.",
                    color: "danger",
                    variant: "solid",
                    timeout: 2000,
                    shouldShowTimeoutProgress: true,
                });
                return;
            }

            const a: any = data;

            setAccionista({
                nombre: a.nombre ?? "",
                apellidos: a.apellidos ?? "",
                rut: a.rut ?? "",
                nacionalidad: a.nacionalidad ?? "",
                direccion: a.direccion ?? "",
                ciudad: a.ciudad ?? "",
                fono: a.fono ?? "",
                saldo:
                    a.saldo_acciones != null
                        ? `${a.saldo_acciones} acciones`
                        : "0 acciones",
                firma: "",
            });

            setAccionistaId(a.id ?? null);
            setMovimientos([]);
            setMovimientosPage(0);
            setIsRegistroOpen(false);
            addToast({
                title: "Registro guardado",
                description: "El registro del accionista se guardó con éxito.",
                color: "success",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
        } finally {
            setRegistroSaving(false);
        }
    };

    const handleOpenMovimiento = () => {
        setNewMovimiento(emptyMovimiento);
        setMovimientoFecha(null);
        setIsMovimientoOpen(true);
    };

    const handleSaveMovimiento = async () => {
        if (!accionistaId) {
            addToast({
                title: "No hay accionista seleccionado",
                description: "Debes buscar o crear un accionista antes de agregar movimientos.",
                color: "warning",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
            return;
        }

        const comprasNumber = newMovimiento.compras ? Number(newMovimiento.compras) : null;
        const ventasNumber = newMovimiento.ventas ? Number(newMovimiento.ventas) : null;
        const saldoNumber = newMovimiento.saldo ? Number(newMovimiento.saldo) : null;

        try {
            const { data, error } = await supabase
                .from("movimientos")
                .insert({
                    accionista_id: accionistaId,
                    fecha_transferencia: movimientoFecha
                        ? new Date(
                              Number(movimientoFecha.year),
                              Number(movimientoFecha.month) - 1,
                              Number(movimientoFecha.day),
                          ).toISOString()
                        : null,
                    numero_transferencia: newMovimiento.transferencia || null,
                    titulo_inutilizado: newMovimiento.tituloAnulado || null,
                    comprado_a: newMovimiento.compradoA || null,
                    vendido_a: newMovimiento.vendidoA || null,
                    titulo_nuevo_comprador: newMovimiento.tituloNuevoComprador || null,
                    titulo_nuevo_vendedor: newMovimiento.tituloNuevoVendedor || null,
                    numero_titulo_emitido: newMovimiento.tituloEmitido || null,
                    compras: comprasNumber,
                    ventas: ventasNumber,
                    saldo: saldoNumber,
                    observaciones: newMovimiento.observaciones || null,
                })
                .select("*")
                .single();

            if (error) {
                console.error("Error insertando movimiento:", error);
                console.log("Supabase movimientos error details:", {
                    message: (error as any).message,
                    details: (error as any).details,
                    hint: (error as any).hint,
                    code: (error as any).code,
                });

                addToast({
                    title: "Error al guardar el movimiento",
                    description: "No se pudo guardar el movimiento. Intenta nuevamente.",
                    color: "danger",
                    variant: "solid",
                    timeout: 2000,
                    shouldShowTimeoutProgress: true,
                });
                return;
            }

            // Actualizar la lista local de movimientos con el nuevo registro
            const newRow = {
                id: data.id,
                displayId: movimientos.length ? Math.max(...movimientos.map((row) => row.displayId || 0)) + 1 : 1,
                fecha: data.fecha_transferencia
                    ? (() => {
                          const d = new Date(data.fecha_transferencia);
                          const dd = String(d.getDate()).padStart(2, "0");
                          const mm = String(d.getMonth() + 1).padStart(2, "0");
                          const yyyy = d.getFullYear();
                          return `${dd} - ${mm} - ${yyyy}`;
                      })()
                    : "-",
                transferencia: data.numero_transferencia ?? "-",
                tituloAnulado: data.titulo_inutilizado ?? "-",
                compradoA: data.comprado_a ?? "-",
                vendidoA: data.vendido_a ?? "-",
                tituloNuevoComprador: data.titulo_nuevo_comprador ?? "-",
                tituloNuevoVendedor: data.titulo_nuevo_vendedor ?? "-",
                compras: data.compras != null ? String(data.compras) : "-",
                ventas: data.ventas != null ? String(data.ventas) : "-",
                saldo: data.saldo != null ? String(data.saldo) : "-",
                observaciones: data.observaciones ?? "-",
                tituloEmitido: data.numero_titulo_emitido ?? "-",
            };

            setMovimientos((prev) => [...prev, newRow]);
            setMovimientosTotal((prev) => prev + 1);

            addToast({
                title: "Movimiento guardado",
                description: "El movimiento se guardó con éxito.",
                color: "success",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
        } catch (e) {
            console.error("Excepción guardando movimiento:", e);
            addToast({
                title: "Error inesperado",
                description: "Ocurrió un error guardando el movimiento.",
                color: "danger",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
        }
    };

    const handleEditKeyDown = (event: any) => {
        if (!isEditMode) return;

        if (event.key === "Enter" && editingRowId != null && editingMovimiento) {
            event.preventDefault();
            setIsConfirmEditOpen(true);
        }
    };

    const handleConfirmEditMovimiento = async () => {
        if (editingRowId == null || !editingMovimiento) {
            setIsConfirmEditOpen(false);
            return;
        }

        // Encontrar la fila actual en movimientos (con los cambios ya aplicados)
        const updatedRow = movimientos.find((row) => row.id === editingRowId);
        if (!updatedRow) {
            setIsConfirmEditOpen(false);
            return;
        }

        // Actualizar en Supabase
        try {
            const { error } = await supabase
                .from("movimientos")
                .update({
                    fecha_transferencia: updatedRow.fecha !== "-" 
                        ? (() => {
                            const parts = updatedRow.fecha.split(" - ");
                            if (parts.length === 3) {
                                const [dd, mm, yyyy] = parts;
                                return new Date(Number(yyyy), Number(mm) - 1, Number(dd)).toISOString();
                            }
                            return null;
                        })()
                        : null,
                    numero_transferencia: updatedRow.transferencia !== "-" ? updatedRow.transferencia : null,
                    titulo_inutilizado: updatedRow.tituloAnulado !== "-" ? updatedRow.tituloAnulado : null,
                    comprado_a: updatedRow.compradoA !== "-" ? updatedRow.compradoA : null,
                    vendido_a: updatedRow.vendidoA !== "-" ? updatedRow.vendidoA : null,
                    titulo_nuevo_comprador: updatedRow.tituloNuevoComprador !== "-" ? updatedRow.tituloNuevoComprador : null,
                    titulo_nuevo_vendedor: updatedRow.tituloNuevoVendedor !== "-" ? updatedRow.tituloNuevoVendedor : null,
                    numero_titulo_emitido: updatedRow.tituloEmitido !== "-" ? updatedRow.tituloEmitido : null,
                    compras: updatedRow.compras !== "-" ? Number(updatedRow.compras) : null,
                    ventas: updatedRow.ventas !== "-" ? Number(updatedRow.ventas) : null,
                    saldo: updatedRow.saldo !== "-" ? Number(updatedRow.saldo) : null,
                    observaciones: updatedRow.observaciones !== "-" ? updatedRow.observaciones : null,
                })
                .eq("id", editingRowId);

            if (error) {
                console.error("Error actualizando movimiento:", error);
                addToast({
                    title: "Error al actualizar",
                    description: "No se pudo guardar el movimiento en la base de datos.",
                    color: "danger",
                    variant: "solid",
                    timeout: 2000,
                    shouldShowTimeoutProgress: true,
                });
                return;
            }

            addToast({
                title: "Cambios guardados",
                description: "El movimiento se actualizó correctamente.",
                color: "success",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
        } catch (e) {
            console.error("Excepción actualizando movimiento:", e);
            addToast({
                title: "Error inesperado",
                description: "Ocurrió un error al guardar los cambios.",
                color: "danger",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
        }

        setEditingRowId(null);
        setEditingMovimiento(null);
        setIsConfirmEditOpen(false);
        setIsEditMode(false);
    };

    const handleCancelEditMovimiento = () => {
        if (editingRowId != null) {
            const original = movimientos.find((row) => row.id === editingRowId);
            if (original) {
                setEditingMovimiento({ ...original });
            } else {
                setEditingMovimiento(null);
                setEditingRowId(null);
            }
        }
        setIsConfirmEditOpen(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-red-700 to-red-800 px-4 py-6">
            {/* Toasts globales de HeroUI (abajo al centro) */}
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center">
                <ToastProvider placement="bottom-center" />
            </div>

            <div className="flex w-full flex-col gap-4">
                {/* Rectángulo superior: barra de búsqueda + datos accionista */}
                <Card className="w-full bg-white/95 shadow-xl">
                    <CardHeader className="flex flex-col gap-4 px-6 pt-6 pb-4 lg:flex-row lg:items-start lg:justify-between">
                        {/* Izquierda: título + barra de búsqueda + botones */}
                        <div className="flex flex-1 flex-col gap-3">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                                    Libro electrónico de accionistas
                                </p>
                                <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                                    Estadio Croata
                                </h1>
                            </div>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <Input
                                    label="Buscar"
                                    radius="sm"
                                    variant="bordered"
                                    placeholder="Buscar por nombre, apellido o RUT..."
                                    className="md:w-80 lg:w-96"
                                    classNames={{
                                        inputWrapper: "bg-white border-gray-200",
                                        input: "text-black placeholder:text-gray-400",
                                    }}
                                    value={searchTerm}
                                    onValueChange={setSearchTerm}
                                />
                                <div className="flex gap-2 md:flex-none">
                                    <Button
                                        className="text-black"
                                        radius="sm"
                                        variant="shadow"
                                        color="success"
                                        onPress={handleOpenCreateRegistro}
                                    >
                                        Crear registro
                                    </Button>
                                    <Button
                                        radius="sm"
                                        variant="shadow"
                                        color="primary"
                                        onPress={() => router.push("/admin/users")}
                                    >
                                        Crear usuario
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-col items-start">
                                <div className="flex w-40 flex-col items-center gap-2">
                                    <Image
                                        src="/estadio_croatalogo.png"
                                        alt="Logo Estadio Croata"
                                        width={160}
                                        height={48}
                                        className="h-auto w-40 object-contain"
                                        priority
                                    />
                                    <Button
                                        radius="sm"
                                        size="sm"
                                        variant="shadow"
                                        color="danger"
                                        onPress={() => {
                                            document.cookie = "logged_in=; path=/; max-age=0";
                                            router.push("/login");
                                        }}
                                    >
                                        Cerrar sesión
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Derecha: resumen rápido del accionista */}
                        <div className="mt-2 w-full max-w-xl rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 lg:mt-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                                Datos accionista
                            </p>
                            <p className="mt-1 text-base font-semibold text-gray-900">
                                {[accionista.nombre, accionista.apellidos].filter(Boolean).join(" ")}
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">RUT</p>
                                    <p className="text-sm text-gray-900">{accionista.rut || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Nacionalidad</p>
                                    <p className="text-sm text-gray-900">{accionista.nacionalidad || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Dirección</p>
                                    <p className="text-sm text-gray-900">{accionista.direccion || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Ciudad</p>
                                    <p className="text-sm text-gray-900">{accionista.ciudad || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Fono</p>
                                    <p className="text-sm text-gray-900">{accionista.fono || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Saldo</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {movimientos.length > 0
                                            ? movimientos[movimientos.length - 1].saldo
                                            : accionista.saldo ?? "-"}
                                    </p>
                                </div>
                            </div>

                            {/* Firma del accionista */}
                            <div className="mt-4 border-t border-dashed border-gray-200 pt-3">
                                <p className="text-[11px] text-gray-500">Firma accionista</p>
                                <div className="mt-2 flex flex-col items-center gap-1">
                                    <div className="h-10 w-full max-w-xs rounded-md border border-gray-200 bg-white px-4 py-1.5">
                                        <p className="text-lg font-semibold text-gray-700 italic font-[cursive] tracking-wide">
                                            {[accionista.nombre, accionista.apellidos]
                                                .filter(Boolean)
                                                .join(" ")}
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-gray-400">
                                        ______________________________
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Rectángulo inferior: tabla grande */}
                <Card className="w-full flex-1 bg-white/95 shadow-xl">
                    <CardBody className="flex h-[calc(100vh-220px)] flex-col px-4 pb-4 pt-4">
                        <div className="mb-2 flex items-center justify-between text-sm text-gray-500 pb-4">
                            <p>Movimientos del accionista seleccionado</p>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    radius="sm"
                                    variant="shadow"
                                    color="primary"
                                    onPress={handleOpenMovimiento}
                                >
                                    Agregar movimiento
                                </Button>
                                <Button
                                    size="sm"
                                    radius="sm"
                                    variant={isEditMode ? "bordered" : "flat"}
                                    color={isEditMode ? "warning" : "default"}
                                    onPress={() => {
                                        setIsEditMode((prev) => !prev);
                                        setEditingRowId(null);
                                        setEditingMovimiento(null);
                                        setIsConfirmEditOpen(false);
                                    }}
                                >
                                    {isEditMode ? "Salir de edición" : "Editar"}
                                </Button>
                                <p>
                                    Total registros: <span className="font-semibold text-gray-800">{movimientos.length}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden">
                            <p
                                id="movimientos-description"
                                className="sr-only"
                            >
                                Tabla de movimientos de acciones del accionista seleccionado. Usa las flechas del teclado para moverte por las filas.
                            </p>
                            {isTableMounted && (
                                <Table
                                    key={`table-${isEditMode ? 'edit' : 'view'}`}
                                    aria-label="Movimientos de acciones del accionista seleccionado"
                                    aria-describedby="movimientos-description"
                                    color="primary"
                                    classNames={{
                                        th: "px-3 py-3",
                                    }}
                                >
                                    <TableHeader>
                                        <TableColumn className="w-[2.5rem]">
                                            <span className="block leading-tight">
                                                FECHA
                                                <br />
                                                TRANSFERENCIA
                                            </span>
                                        </TableColumn>
                                        <TableColumn className="w-[3.5rem]">N° TRANSFERENCIA</TableColumn>
                                        <TableColumn className="w-[3.5rem]">
                                            <span className="block leading-tight">
                                                N° TÍTULO
                                                <br />
                                                INUTILIZADO
                                            </span>
                                        </TableColumn>
                                        <TableColumn className="min-w-[210px]">COMPRADO A</TableColumn>
                                        <TableColumn className="min-w-[210px]">VENDIDO A</TableColumn>
                                        <TableColumn className="w-[5.5rem]">
                                            <span className="block leading-tight">
                                                N° TÍTULO NUEVO
                                                <br />
                                                COMPRADOR
                                            </span>
                                        </TableColumn>
                                        <TableColumn className="w-[5.5rem]">
                                            <span className="block leading-tight">
                                                N° TÍTULO NUEVO
                                                <br />
                                                VENDEDOR
                                            </span>
                                        </TableColumn>
                                        <TableColumn className="w-[4rem]">COMPRAS</TableColumn>
                                        <TableColumn className="w-[4rem]">VENTAS</TableColumn>
                                        <TableColumn className="w-[4rem]">SALDO</TableColumn>
                                        <TableColumn>OBSERVACIONES</TableColumn>
                                        <TableColumn className="w-[5.5rem]">
                                            <span className="block leading-tight">
                                                N° TÍTULO
                                                <br />
                                                EMITIDO
                                            </span>
                                        </TableColumn>
                                    </TableHeader>
                                    <TableBody items={movimientos}>
                                        {(row) => {
                                            return (
                                                <TableRow key={row.id.toString()}>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-sm",
                                                                }}
                                                                value={row.fecha}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, fecha: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.fecha
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-sm",
                                                                }}
                                                                value={row.transferencia}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, transferencia: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.transferencia
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-base",
                                                                }}
                                                                value={row.tituloAnulado}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, tituloAnulado: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.tituloAnulado
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-sm",
                                                                }}
                                                                value={row.compradoA}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, compradoA: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.compradoA
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-sm",
                                                                }}
                                                                value={row.vendidoA}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, vendidoA: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.vendidoA
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-base",
                                                                }}
                                                                value={row.tituloNuevoComprador}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, tituloNuevoComprador: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.tituloNuevoComprador
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-base",
                                                                }}
                                                                value={row.tituloNuevoVendedor}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, tituloNuevoVendedor: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.tituloNuevoVendedor
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-base",
                                                                }}
                                                                value={row.compras}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, compras: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.compras
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-base",
                                                                }}
                                                                value={row.ventas}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, ventas: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.ventas
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-base",
                                                                }}
                                                                value={row.saldo}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, saldo: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.saldo
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-base",
                                                                }}
                                                                value={row.observaciones}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, observaciones: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.observaciones
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditMode ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                classNames={{
                                                                    inputWrapper:
                                                                        "!bg-white !border !border-gray-300 hover:!border-gray-400 focus-within:!border-gray-500",
                                                                    input: "text-black placeholder:!text-black text-base",
                                                                }}
                                                                value={row.tituloEmitido}
                                                                onValueChange={(value) =>
                                                                    setMovimientos((prev) =>
                                                                        prev.map((r) =>
                                                                            r.id === row.id ? { ...r, tituloEmitido: value } : r
                                                                        )
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    setEditingRowId(row.id);
                                                                    setEditingMovimiento({ ...row });
                                                                }}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.tituloEmitido
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                        <Modal isOpen={isRegistroOpen} onOpenChange={setIsRegistroOpen}>
                            <ModalContent className="bg-white text-gray-900">
                                {(onClose) => (
                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            handleSaveRegistro();
                                            onClose();
                                        }}
                                    >
                                        <ModalHeader className="flex flex-col gap-1">
                                            Crear registro (página del libro)
                                        </ModalHeader>
                                        <ModalBody>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <Input
                                                    label="Nombres"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.nombre}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            nombre: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Apellidos"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.apellidos}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            apellidos: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="RUT"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.rut}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            rut: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Nacionalidad"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.nacionalidad}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            nacionalidad: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Dirección"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.direccion}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            direccion: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Ciudad"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.ciudad}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            ciudad: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Fono"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.fono}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            fono: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Saldo actual"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.saldo}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            saldo: value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </ModalBody>
                                        <ModalFooter>
                                            <Button radius="sm" variant="flat" type="button" onPress={() => onClose()}>
                                                Cancelar
                                            </Button>
                                            <Button
                                                color="primary"
                                                radius="sm"
                                                type="submit"
                                            >
                                                Guardar registro
                                            </Button>
                                        </ModalFooter>
                                    </form>
                                )}
                            </ModalContent>
                        </Modal>
                        <Modal isOpen={isMovimientoOpen} onOpenChange={setIsMovimientoOpen}>
                            <ModalContent className="bg-white text-gray-900">
                                {(onClose) => (
                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            handleSaveMovimiento();
                                            onClose();
                                        }}
                                    >
                                        <ModalHeader className="flex flex-col gap-1">
                                            Nuevo movimiento
                                        </ModalHeader>
                                        <ModalBody>
                                            <p className="text-xs font-medium text-gray-500">
                                                Accionista:{" "}
                                                <span className="text-gray-900">
                                                    {[accionista.nombre, accionista.apellidos]
                                                        .filter(Boolean)
                                                        .join(" ")}
                                                </span>
                                            </p>
                                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <DatePicker
                                                    label="Fecha transferencia"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "!bg-white !border !border-gray-300 hover:!border-gray-400 data-[focus=true]:!border-gray-500 data-[open=true]:!border-gray-500",
                                                        input: "!text-black",
                                                        innerWrapper: "!text-black",
                                                        segment: "!text-black data-[placeholder]:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    className="max-w-[284px] [&_[data-slot=segment]]:!text-black [&_[data-slot=segment][data-placeholder]]:!text-black"
                                                    value={movimientoFecha}
                                                    onChange={(value) => {
                                                        setMovimientoFecha(value);

                                                        if (value) {
                                                            const dd = String(value.day).padStart(2, "0");
                                                            const mm = String(value.month).padStart(2, "0");
                                                            const yyyy = String(value.year);
                                                            const formatted = `${dd}/${mm}/${yyyy}`;

                                                            setNewMovimiento((prev) => ({
                                                                ...prev,
                                                                fecha: formatted,
                                                            }));
                                                        } else {
                                                            setNewMovimiento((prev) => ({
                                                                ...prev,
                                                                fecha: "",
                                                            }));
                                                        }
                                                    }}
                                                />
                                                <Input
                                                    label="N° transferencia"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={newMovimiento.transferencia}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            transferencia: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="N° título inutilizado"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={newMovimiento.tituloAnulado}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            tituloAnulado: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Comprado a"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={newMovimiento.compradoA}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            compradoA: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Vendido a"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={newMovimiento.vendidoA}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            vendidoA: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="N° título nuevo del comprador"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={newMovimiento.tituloNuevoComprador}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            tituloNuevoComprador: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="N° título nuevo del vendedor"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={newMovimiento.tituloNuevoVendedor}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            tituloNuevoVendedor: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Compras"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={newMovimiento.compras}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            compras: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Ventas"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={newMovimiento.ventas}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            ventas: value,
                                                        }))
                                                    }
                                                />
                                                 <Input
                                                    label="Saldo"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={newMovimiento.saldo}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            saldo: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Observaciones"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={newMovimiento.observaciones}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            observaciones: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="N° del título emitido"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={newMovimiento.tituloEmitido}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            tituloEmitido: value,
                                                        }))
                                                    }
                                                />                                         
                                            </div>
                                        </ModalBody>
                                        <ModalFooter>
                                            <Button radius="sm" variant="flat" type="button" onPress={() => onClose()}>
                                                Cancelar
                                            </Button>
                                            <Button
                                                color="primary"
                                                radius="sm"
                                                type="submit"
                                            >
                                                Guardar movimiento
                                            </Button>
                                        </ModalFooter>
                                    </form>
                                )}
                            </ModalContent>
                        </Modal>
                    </CardBody>
                </Card>

                {/* Modal de confirmación para edición de movimiento */}
                <Modal isOpen={isConfirmEditOpen} onOpenChange={setIsConfirmEditOpen}>
                    <ModalContent className="bg-white text-gray-900">
                        {(onClose) => (
                            <>
                                <ModalHeader className="flex flex-col gap-1">
                                    Confirmar cambios
                                </ModalHeader>
                                <ModalBody>
                                    <p>¿Quieres guardar los cambios realizados en este movimiento?</p>
                                </ModalBody>
                                <ModalFooter>
                                    <Button
                                        radius="sm"
                                        variant="flat"
                                        onPress={() => {
                                            handleCancelEditMovimiento();
                                            onClose();
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        radius="sm"
                                        color="primary"
                                        onPress={() => {
                                            handleConfirmEditMovimiento();
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
            </div>
        </div>
    );
}
