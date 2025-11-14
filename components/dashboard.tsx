"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";

const mockRows = [
    // Fila 1 del libro
    {
        id: 1,
        fecha: "01/02/90",
        transferencia: "—",
        tituloAnulado: "166",
        compradoA: "Heredad de Fanny Ambolicic L.",
        vendidoA: "—",
        tituloNuevoComprador: "1109",
        tituloNuevoVendedor: "—",
        tituloEmitido: "1109",
        compras: "—",
        ventas: "—",
        saldo: "—",
        observaciones: "Reg. 1/552",
    },
    // Fila 2 del libro
    {
        id: 2,
        fecha: "",
        transferencia: "—",
        tituloAnulado: "144",
        compradoA: "—",
        vendidoA: "—",
        tituloNuevoComprador: "1108",
        tituloNuevoVendedor: "—",
        tituloEmitido: "1108",
        compras: "—",
        ventas: "—",
        saldo: "—",
        observaciones: "Reg. 1/372",
    },
    // Fila 3 del libro
    {
        id: 3,
        fecha: "06/03/90",
        transferencia: "—",
        tituloAnulado: "1109, 1108",
        compradoA: "—",
        vendidoA: "Antonio Castonic Cukonic",
        tituloNuevoComprador: "1110",
        tituloNuevoVendedor: "—",
        tituloEmitido: "1110",
        compras: "—",
        ventas: "15",
        saldo: "0",
        observaciones: "Reg. 2/361",
    },
];

export function Dashboard() {
    const router = useRouter();
    const [isTableMounted, setIsTableMounted] = useState(false);

    useEffect(() => {
        setIsTableMounted(true);
    }, []);

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
                                    Libro de accionistas electrónico
                                </p>
                                <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                                    Estadio Croata
                                </h1>
                            </div>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <Input
                                    radius="sm"
                                    variant="bordered"
                                    placeholder="Buscar por nombre, RUT o número de título..."
                                    className="md:w-80 lg:w-96"
                                    classNames={{
                                        inputWrapper: "bg-white border-gray-200",
                                    }}
                                />
                                <div className="flex gap-2 md:flex-none">
                                    <Button radius="sm" className="bg-blue-600 text-white"
                                    variant="shadow"
                                    color="primary"

                                    >
                                        Buscar
                                    </Button>
                                    <Button className="text-black"
                                        radius="sm"
                                        variant="shadow"
                                        color="success"

                                    >
                                        Crear registro
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
                                        onPress={() => router.push("/login")}
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
                                Roque Anibalonic Luksic
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">RUT</p>
                                    <p className="text-sm text-gray-900">12.345.678-9</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Nacionalidad</p>
                                    <p className="text-sm text-gray-900">Chilena</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Dirección</p>
                                    <p className="text-sm text-gray-900">Vitacura #8049</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Ciudad</p>
                                    <p className="text-sm text-gray-900">Santiago</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Fono</p>
                                    <p className="text-sm text-gray-900">987654321</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Saldo</p>
                                    <p className="text-sm font-semibold text-gray-900">185 acciones</p>
                                </div>
                            </div>

                            {/* Firma del accionista */}
                            <div className="mt-4 border-t border-dashed border-gray-200 pt-3">
                                <p className="text-[11px] text-gray-500">Firma accionista</p>
                                <div className="mt-2 flex flex-col items-center gap-1">
                                    <div className="h-10 w-full max-w-xs rounded-md border border-gray-200 bg-white px-4 py-1.5">
                                        <p className="text-lg font-semibold text-gray-700 italic font-[cursive] tracking-wide">
                                            Roque A. Luksic
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
                        <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
                            <p>Movimientos del accionista seleccionado</p>
                            <p>
                                Total registros: <span className="font-semibold text-gray-800">{mockRows.length}</span>
                            </p>
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
                                    <TableBody items={mockRows}>
                                        {(row) => (
                                            <TableRow key={row.id.toString()}>
                                                <TableCell>{row.fecha}</TableCell>
                                                <TableCell>{row.transferencia}</TableCell>
                                                <TableCell>{row.tituloAnulado}</TableCell>
                                                <TableCell>{row.compradoA}</TableCell>
                                                <TableCell>{row.vendidoA}</TableCell>
                                                <TableCell>{row.tituloNuevoComprador}</TableCell>
                                                <TableCell>{row.tituloNuevoVendedor}</TableCell>
                                                <TableCell>{row.compras}</TableCell>
                                                <TableCell>{row.ventas}</TableCell>
                                                <TableCell>{row.saldo}</TableCell>
                                                <TableCell>{row.observaciones}</TableCell>
                                                <TableCell>{row.tituloEmitido}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
