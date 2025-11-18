"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { DatePicker } from "@heroui/react";
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
    rut: "—",
    nacionalidad: "—",
    direccion: "—",
    ciudad: "—",
    fono: "—",
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
    const [registroSaving, setRegistroSaving] = useState(false);
    const [toastState, setToastState] = useState<
        | {
              type: "success" | "error";
              message: string;
          }
        | null
    >(null);

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

                // 2) Paginación de movimientos para ese accionista
                const from = movimientosPage * MOV_PAGE_SIZE;
                const to = from + MOV_PAGE_SIZE - 1;

                const { data: movs, error: movsError, count } = await supabase
                    .from("movimientos")
                    .select("*", { count: "exact" })
                    .eq("accionista_id", a.id)
                    .order("fecha_transferencia", { ascending: true })
                    .range(from, to);

                if (!movsError && movs) {
                    const mapped = movs.map((m: any, index: number) => ({
                        id: from + index + 1,
                        fecha: m.fecha_transferencia
                            ? (() => {
                                  const d = new Date(m.fecha_transferencia);
                                  const dd = String(d.getDate()).padStart(2, "0");
                                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                                  const yyyy = d.getFullYear();
                                  return `${dd} - ${mm} - ${yyyy}`;
                              })()
                            : "",
                        transferencia: m.numero_transferencia ?? "—",
                        tituloAnulado: m.titulo_inutilizado ?? "",
                        compradoA: m.comprado_a ?? "—",
                        vendidoA: m.vendido_a ?? "—",
                        tituloNuevoComprador: m.titulo_nuevo_comprador ?? "",
                        tituloNuevoVendedor: m.titulo_nuevo_vendedor ?? "",
                        compras:
                            m.compras != null && m.compras !== undefined
                                ? String(m.compras)
                                : "—",
                        ventas:
                            m.ventas != null && m.ventas !== undefined
                                ? String(m.ventas)
                                : "—",
                        saldo:
                            m.saldo != null && m.saldo !== undefined
                                ? String(m.saldo)
                                : "—",
                        observaciones: m.observaciones ?? "",
                        tituloEmitido: m.numero_titulo_emitido ?? "",
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

    useEffect(() => {
        if (!toastState) return;
        const id = setTimeout(() => setToastState(null), 3000);
        return () => clearTimeout(id);
    }, [toastState]);

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
        if (!registroDraft.nombre || !registroDraft.rut) {
            setToastState({
                type: "error",
                message: "Nombre y RUT son obligatorios",
            });
            return;
        }

        try {
            setRegistroSaving(true);

            const saldoNumber = (() => {
                if (!registroDraft.saldo) return null;
                const match = registroDraft.saldo.match(/\d+/);
                return match ? Number(match[0]) : null;
            })();

            const { data, error } = await supabase
                .from("accionistas")
                .upsert(
                    {
                        nombre: registroDraft.nombre,
                        apellidos: registroDraft.apellidos || null,
                        rut: registroDraft.rut,
                        nacionalidad: registroDraft.nacionalidad || null,
                        direccion: registroDraft.direccion || null,
                        ciudad: registroDraft.ciudad || null,
                        fono: registroDraft.fono || null,
                        saldo_acciones: saldoNumber,
                        firma: null,
                    },
                    { onConflict: "rut" },
                )
                .select("*")
                .single();

            if (error || !data) {
                setToastState({
                    type: "error",
                    message: "Error al guardar el registro",
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

            setMovimientos([]);
            setMovimientosPage(0);
            setIsRegistroOpen(false);
            setToastState({ type: "success", message: "Registro guardado con éxito" });
        } finally {
            setRegistroSaving(false);
        }
    };

    const handleOpenMovimiento = () => {
        setNewMovimiento(emptyMovimiento);
        setIsMovimientoOpen(true);
    };

    const handleSaveMovimiento = () => {
        const nextId = movimientos.length ? Math.max(...movimientos.map((row) => row.id)) + 1 : 1;

        const movimientoConId = {
            id: nextId,
            ...newMovimiento,
        };

        setMovimientos((prev) => [...prev, movimientoConId]);
    };

    const handleSelectionChange = (keys: any) => {
        if (keys === "all") {
            setEditingRowId(null);
            setEditingMovimiento(null);
            return;
        }

        const selected = Array.from(keys);
        if (selected.length === 1) {
            const key = selected[0];
            const id = Number(key);
            const row = movimientos.find((mov) => mov.id === id);
            if (row) {
                setEditingRowId(row.id);
                setEditingMovimiento({ ...row });
            }
        } else {
            setEditingRowId(null);
            setEditingMovimiento(null);
        }
    };

    const handleEditKeyDown = (event: any) => {
        if (event.key === "Enter" && editingRowId != null && editingMovimiento) {
            const confirmed = window.confirm("¿Guardar cambios en este movimiento?");
            if (confirmed) {
                setMovimientos((prev) =>
                    prev.map((row) => (row.id === editingRowId ? { ...row, ...editingMovimiento } : row)),
                );
                setEditingRowId(null);
                setEditingMovimiento(null);
            } else {
                const original = movimientos.find((row) => row.id === editingRowId);
                if (original) {
                    setEditingMovimiento({ ...original });
                } else {
                    setEditingRowId(null);
                    setEditingMovimiento(null);
                }
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-red-700 to-red-800 px-4 py-6">
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
                                        radius="sm"
                                        className="bg-blue-600 text-white"
                                        variant="shadow"
                                        color="primary"
                                    >
                                        Buscar
                                    </Button>
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
                                    <p className="text-sm text-gray-900">{accionista.rut}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Nacionalidad</p>
                                    <p className="text-sm text-gray-900">{accionista.nacionalidad}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Dirección</p>
                                    <p className="text-sm text-gray-900">{accionista.direccion}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Ciudad</p>
                                    <p className="text-sm text-gray-900">{accionista.ciudad}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Fono</p>
                                    <p className="text-sm text-gray-900">{accionista.fono}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Saldo</p>
                                    <p className="text-sm font-semibold text-gray-900">{accionista.saldo}</p>
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
                                    aria-label="Movimientos de acciones del accionista seleccionado"
                                    aria-describedby="movimientos-description"
                                    color="primary"
                                    selectionMode="multiple"
                                    onSelectionChange={handleSelectionChange}
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
                                            const isEditing = editingRowId === row.id;
                                            const current = isEditing && editingMovimiento ? editingMovimiento : row;

                                            return (
                                                <TableRow key={row.id.toString()}>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.fecha}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        fecha: value,
                                                                    }))
                                                                }
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.fecha
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.transferencia}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        transferencia: value,
                                                                    }))
                                                                }
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.transferencia
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.tituloAnulado}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        tituloAnulado: value,
                                                                    }))
                                                                }
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.tituloAnulado
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.compradoA}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        compradoA: value,
                                                                    }))
                                                                }
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.compradoA
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.vendidoA}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        vendidoA: value,
                                                                    }))
                                                                }
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.vendidoA
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.tituloNuevoComprador}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        tituloNuevoComprador: value,
                                                                    }))
                                                                }
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.tituloNuevoComprador
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.tituloNuevoVendedor}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        tituloNuevoVendedor: value,
                                                                    }))
                                                                }
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.tituloNuevoVendedor
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.compras}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        compras: value,
                                                                    }))
                                                                }
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.compras
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.ventas}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        ventas: value,
                                                                    }))
                                                                }
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.ventas
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.saldo}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        saldo: value,
                                                                    }))
                                                                }
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.saldo
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.observaciones}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        observaciones: value,
                                                                    }))
                                                                }
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : (
                                                            row.observaciones
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                variant="bordered"
                                                                radius="sm"
                                                                size="sm"
                                                                value={current.tituloEmitido}
                                                                onValueChange={(value) =>
                                                                    setEditingMovimiento((prev: any) => ({
                                                                        ...(prev || {}),
                                                                        tituloEmitido: value,
                                                                    }))
                                                                }
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
                                    <>
                                        <ModalHeader className="flex flex-col gap-1">
                                            Crear registro (página del libro)
                                        </ModalHeader>
                                        <ModalBody>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <Input
                                                    label="Nombres"
                                                    variant="bordered"
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper: "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                            <Button radius="sm" variant="flat" onPress={() => onClose()}>
                                                Cancelar
                                            </Button>
                                            <Button
                                                color="primary"
                                                radius="sm"
                                                onPress={() => {
                                                    handleSaveRegistro();
                                                    onClose();
                                                }}
                                            >
                                                Guardar registro
                                            </Button>
                                        </ModalFooter>
                                    </>
                                )}
                            </ModalContent>
                        </Modal>
                        <Modal isOpen={isMovimientoOpen} onOpenChange={setIsMovimientoOpen}>
                            <ModalContent className="bg-white text-gray-900">
                                {(onClose) => (
                                    <>
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
                                                    label="Fecha"
                                                    variant="bordered"
                                                    radius="sm"
                                                    classNames={{
                                                        base: "max-w-full",
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
                                                        innerWrapper: "text-gray-900",
                                                        input: "text-gray-900 placeholder:text-gray-500",
                                                    }}
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    label="N° título nuevo comprador"
                                                    variant="bordered"
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    label="N° título nuevo vendedor"
                                                    variant="bordered"
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    label="N° título emitido"
                                                    variant="bordered"
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
                                                    }}
                                                    value={newMovimiento.tituloEmitido}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            tituloEmitido: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Compras"
                                                    variant="bordered"
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
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
                                                    radius="sm"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-gray-100 border-gray-200 text-gray-900",
                                                        label: "text-gray-600",
                                                    }}
                                                    value={newMovimiento.observaciones}
                                                    onValueChange={(value) =>
                                                        setNewMovimiento((prev) => ({
                                                            ...prev,
                                                            observaciones: value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </ModalBody>
                                        <ModalFooter>
                                            <Button radius="sm" variant="flat" onPress={() => onClose()}>
                                                Cancelar
                                            </Button>
                                            <Button
                                                color="primary"
                                                radius="sm"
                                                onPress={() => {
                                                    handleSaveMovimiento();
                                                    onClose();
                                                }}
                                            >
                                                Guardar movimiento
                                            </Button>
                                        </ModalFooter>
                                    </>
                                )}
                            </ModalContent>
                        </Modal>
                    </CardBody>
                </Card>
            </div>

            {toastState && (
                <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
                    <div
                        className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm shadow-lg
                        ${toastState.type === "success" ? "bg-emerald-600 text-emerald-50" : "bg-red-600 text-white"}`}
                    >
                        {toastState.type === "success" && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-100 text-[10px]">
                                ✓
                            </span>
                        )}
                        <span className="font-medium">{toastState.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
