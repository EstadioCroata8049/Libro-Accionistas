"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { DatePicker, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Spinner, ToastProvider, addToast, Checkbox } from "@heroui/react";
import { CalendarDate } from "@internationalized/date";

import { supabase } from "@/lib/supabaseClient";

const SearchInput = dynamic(async () => {
    const mod = await import("@heroui/input");
    return mod.Input;
}, { ssr: false });

const MOV_PAGE_SIZE = 50;

const iconClasses = "text-xl text-default-500 pointer-events-none shrink-0";

const AddNoteIcon = (props: any) => {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            focusable="false"
            height="1em"
            role="presentation"
            viewBox="0 0 24 24"
            width="1em"
            {...props}
        >
            <path
                d="M7.37 22h9.25a4.87 4.87 0 0 0 4.87-4.87V8.37a4.87 4.87 0 0 0-4.87-4.87H7.37A4.87 4.87 0 0 0 2.5 8.37v8.75c0 2.7 2.18 4.88 4.87 4.88Z"
                fill="currentColor"
                opacity={0.4}
            />
            <path
                d="M8.29 6.29c-.42 0-.75-.34-.75-.75V2.75a.749.749 0 1 1 1.5 0v2.78c0 .42-.33.76-.75.76ZM15.71 6.29c-.42 0-.75-.34-.75-.75V2.75a.749.749 0 1 1 1.5 0v2.78c0 .42-.33.76-.75.76ZM12 14.75h-1.69V13c0-.41-.34-.75-.75-.75s-.75.34-.75.75v1.75H7c-.41 0-.75.34-.75.75s.34.75.75.75h1.81V18c0 .41.34.75.75.75s.75-.34.75-.75v-1.75H12c.41 0 .75-.34.75-.75s-.34-.75-.75-.75Z"
                fill="currentColor"
            />
        </svg>
    );
};

const DownloadIcon = (props: any) => {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            focusable="false"
            height="1em"
            role="presentation"
            viewBox="0 0 24 24"
            width="1em"
            {...props}
        >
            <path
                d="M12.12 15.5a.75.75 0 0 1-.53-.22l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.97 2.97 2.97-2.97a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-.53.22Z"
                fill="currentColor"
            />
            <path
                d="M12 15.5c-.41 0-.75-.34-.75-.75V3.5c0-.41.34-.75.75-.75s.75.34.75.75v11.25c0 .41-.34.75-.75.75Z"
                fill="currentColor"
            />
            <path
                d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12S6.07 1.25 12 1.25 22.75 6.07 22.75 12 17.93 22.75 12 22.75Zm0-20C6.9 2.75 2.75 6.9 2.75 12S6.9 21.25 12 21.25s9.25-4.15 9.25-9.25S17.1 2.75 12 2.75Z"
                fill="currentColor"
                opacity={0.4}
            />
        </svg>
    );
};

const ExportIcon = (props: any) => {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            focusable="false"
            height="1em"
            role="presentation"
            viewBox="0 0 24 24"
            width="1em"
            {...props}
        >
            <path
                d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81v8.37C2 19.83 4.17 22 7.81 22h8.37c3.64 0 5.81-2.17 5.81-5.81V7.81C22 4.17 19.83 2 16.19 2Z"
                fill="currentColor"
                opacity={0.4}
            />
            <path
                d="M16.78 9.7h-4.99c-.55 0-1-.45-1-1V2.75c0-.3.34-.48.58-.3l5.67 4.17c.27.2.27.62 0 .82l-.26.26Z"
                fill="currentColor"
            />
        </svg>
    );
};

// Función para formatear RUT chileno: XX.XXX.XXX-X
const formatRut = (value: string): string => {
    // Remover todo excepto números y K/k
    let cleaned = value.replace(/[^0-9kK]/g, "");
    
    // Separar números y letras
    const numbers = cleaned.replace(/[kK]/g, "");
    const hasK = /[kK]/.test(cleaned);
    
    // El cuerpo solo puede tener números (máximo 8)
    const body = numbers.slice(0, 8);
    
    // El dígito verificador puede ser número o K (solo si hay números antes)
    let dv = "";
    if (body.length > 0) {
        if (hasK) {
            dv = "K";
        } else if (numbers.length > body.length) {
            dv = numbers.slice(body.length, body.length + 1);
        }
    }
    
    if (body.length === 0) return "";
    if (dv === "") return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    // Formatear el cuerpo con puntos
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    return `${formattedBody}-${dv}`;
};

// Función para limpiar RUT (quitar formato, dejar solo números y dígito verificador)
const cleanRut = (value: string): string => {
    return value.replace(/[^0-9kK]/g, "");
};

// Función para formatear teléfono chileno: +56 XXXX XXXX
const formatPhone = (value: string): string => {
    // Si el valor está vacío o es solo el prefijo, devolver el prefijo
    if (!value || value === "+56" || value === "+56 ") {
        return "+56 ";
    }
    
    // Remover todo excepto números
    const cleanedRaw = value.replace(/[^0-9]/g, "");

    // Normalizar: si viene como 569XXXXXXXX, quitar el 9 extra
    let cleaned = cleanedRaw;
    if (cleanedRaw.startsWith("569")) {
        cleaned = `56${cleanedRaw.slice(3)}`;
    }
    
    // Si está vacío después de limpiar, devolver el prefijo
    if (cleaned.length === 0) return "+56 ";
    
    // Si empieza con 56, usar esos dígitos; si empieza con 9, quitarlo
    let numbers = cleaned;
    if (cleaned.startsWith("56")) {
        numbers = cleaned.slice(2);
    } else if (cleaned.startsWith("9")) {
        numbers = cleaned.slice(1);
    }
    
    // Limitar a 8 dígitos después del prefijo
    numbers = numbers.slice(0, 8);
    
    if (numbers.length === 0) return "+56 ";
    
    // Formatear: +56 XXXX XXXX
    if (numbers.length <= 4) {
        return `+56 ${numbers}`;
    } else {
        return `+56 ${numbers.slice(0, 4)} ${numbers.slice(4)}`;
    }
};

// Función para limpiar teléfono (quitar formato, dejar solo números)
const cleanPhone = (value: string): string => {
    const cleanedRaw = value.replace(/[^0-9]/g, "");

    // Normalizar: si empieza con 569, convertir a 56 + 8 dígitos
    if (cleanedRaw.startsWith("569")) {
        const rest = cleanedRaw.slice(3); // quitar 569
        const numero = rest.slice(0, 8); // máximo 8 dígitos
        return numero.length > 0 ? `56${numero}` : "";
    }

    const cleaned = cleanedRaw;

    // Si empieza con 56, devolverlo (recortando a largo máximo razonable)
    if (cleaned.startsWith("56")) {
        const numero = cleaned.slice(2).slice(0, 8);
        return numero.length > 0 ? `56${numero}` : "";
    }

    // Si no, agregar el prefijo 56 y limitar a 8 dígitos
    const numero = cleaned.slice(0, 8);
    return numero.length > 0 ? `56${numero}` : "";
};

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
    nombre: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    rut: "-",
    nacionalidad: "-",
    direccion: "-",
    ciudad: "-",
    email: "-",
    registro: "-",
    fono: "-",
    fechaDefuncion: "-",
    saldo: "-",
    firma: "",
};

export function Dashboard() {
    const router = useRouter();
    const pdfInputRef = useRef<HTMLInputElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const [isTableMounted, setIsTableMounted] = useState(false);
    const [isClientMounted, setIsClientMounted] = useState(false);
    const [movimientos, setMovimientos] = useState<any[]>([]);
    const [movimientosTotal, setMovimientosTotal] = useState(0);
    const [movimientosPage, setMovimientosPage] = useState(0);
    const [accionista, setAccionista] = useState(emptyAccionista);
    const [accionistaId, setAccionistaId] = useState<string | null>(null);
    const [selectedAccionistaId, setSelectedAccionistaId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [isRegistroOpen, setIsRegistroOpen] = useState(false);
    const [registroDraft, setRegistroDraft] = useState({
        nombre: "",
        apellidoPaterno: "",
        apellidoMaterno: "",
        rut: "",
        nacionalidad: "",
        direccion: "",
        ciudad: "",
        email: "",
        registro: "",
        fono: "",
        fechaDefuncion: "",
        fallecido: false,
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
    const [isExportTotalLoading, setIsExportTotalLoading] = useState(false);
    const [isExportPresenteLoading, setIsExportPresenteLoading] = useState(false);
    const [accionistaPdfUrl, setAccionistaPdfUrl] = useState<string | null>(null);
    const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [currentEmpresaId, setCurrentEmpresaId] = useState<string | null>(null);
    const [currentEmpresaNombre, setCurrentEmpresaNombre] = useState<string | null>(null);
    const [currentEmpresaRut, setCurrentEmpresaRut] = useState<string | null>(null);
    const [accionistaOriginal, setAccionistaOriginal] = useState<any>(null); // Para detectar cambios en edición
    const [isSelectAccionistaOpen, setIsSelectAccionistaOpen] = useState(false);
    const [listaAccionistas, setListaAccionistas] = useState<any[]>([]);
    const [isListaAccionistasLoading, setIsListaAccionistasLoading] = useState(false);
    const [listaAccionistasFilter, setListaAccionistasFilter] = useState("");
    const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
    const [isSearchSuggestionsOpen, setIsSearchSuggestionsOpen] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    useEffect(() => {
        const t = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 350);

        return () => {
            window.clearTimeout(t);
        };
    }, [searchTerm]);

    const [isDeleteAccionistaOpen, setIsDeleteAccionistaOpen] = useState(false);
    const [isDeletingAccionista, setIsDeletingAccionista] = useState(false);

    // Obtener el usuario actual y empresa de las cookies al montar el componente
    useEffect(() => {
        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (name === "current_user" && value) {
                setCurrentUser(decodeURIComponent(value));
            }
            if (name === "current_empresa_id" && value) {
                setCurrentEmpresaId(value);
            }
            if (name === "current_empresa_nombre" && value) {
                setCurrentEmpresaNombre(decodeURIComponent(value));
            }
            if (name === "current_empresa_rut" && value) {
                setCurrentEmpresaRut(decodeURIComponent(value));
            }
        }
    }, []);

    // Función para registrar actividad en la tabla activity_logs
    const logActivity = async (action: string, entityType: string, entityId: string, entityName: string, changes?: string) => {
        if (!currentUser) {
            console.warn("No hay usuario actual para registrar actividad");
            return;
        }
        
        try {
            const { error } = await supabase.from("activity_logs").insert({
                user_name: currentUser,
                action,
                entity_type: entityType,
                entity_id: entityId,
                entity_name: entityName,
                changes: changes || null,
                empresa_id: currentEmpresaId || null,
            });
            
            if (error) {
                console.error("Error Supabase al registrar actividad:", error);
            } else {
                console.log("Actividad registrada:", { action, entityType, entityName, changes, user: currentUser, empresa: currentEmpresaId });
            }
        } catch (error) {
            console.error("Error registrando actividad:", error);
        }
    };

    const handleOpenSelectAccionista = async () => {
        if (!currentEmpresaId) {
            addToast({
                title: "Sin empresa",
                description: "Debes seleccionar una empresa antes de elegir un accionista.",
                color: "warning",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
            return;
        }

        setIsSelectAccionistaOpen(true);
        setIsListaAccionistasLoading(true);

        const { data, error } = await supabase
            .from("accionistas")
            .select("id, nombre, apellido_paterno, apellido_materno, rut, registro")
            .eq("empresa_id", currentEmpresaId)
            .order("apellido_paterno", { ascending: true });

        if (error) {
            console.error("Error cargando lista de accionistas:", error);
            addToast({
                title: "Error",
                description: "No se pudo cargar la lista de accionistas.",
                color: "danger",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
            setIsListaAccionistasLoading(false);
            return;
        }

        setListaAccionistas(data || []);
        setIsListaAccionistasLoading(false);
    };

    const handleSelectAccionistaFromList = (acc: any) => {
        const apellidosTexto =
            [acc.apellido_paterno, acc.apellido_materno]
                .filter(Boolean)
                .join(" ");
        // Mostrar siempre el nombre completo en el buscador
        const nombreCompleto = [acc.nombre, apellidosTexto]
            .filter(Boolean)
            .join(" ");
        setSearchTerm(nombreCompleto);
        setSelectedAccionistaId(acc.id ?? null);
        setMovimientosPage(0);
        setIsSelectAccionistaOpen(false);
        setIsSearchSuggestionsOpen(false);
    };

    const handleSearchChange = async (rawValue: string) => {
        // Mantener comportamiento actual de formatear RUT
        let nextValue = rawValue;
        if (/\d/.test(rawValue)) {
            nextValue = formatRut(rawValue);
        }
        setSearchTerm(nextValue);
        // Si el usuario está escribiendo manualmente, dejar de forzar selección por id
        setSelectedAccionistaId(null);

        const term = nextValue.trim();

        // Si no hay empresa o el término es corto, limpiar sugerencias
        if (!currentEmpresaId || term.length < 2) {
            setSearchSuggestions([]);
            setIsSearchSuggestionsOpen(false);
            return;
        }

        setIsSearchLoading(true);
        setIsSearchSuggestionsOpen(true);

        const { data, error } = await supabase
            .from("accionistas")
            .select("id, nombre, apellido_paterno, apellido_materno, rut, registro")
            .eq("empresa_id", currentEmpresaId)
            .or(
                `rut.ilike.%${term.replace(/[^0-9kK]/g, "")}%,nombre.ilike.%${term}%,apellido_paterno.ilike.%${term}%,apellido_materno.ilike.%${term}%`,
            )
            .order("apellido_paterno", { ascending: true })
            .limit(20);

        if (error) {
            console.error("Error cargando sugerencias de accionistas:", error);
            setSearchSuggestions([]);
            setIsSearchSuggestionsOpen(false);
            setIsSearchLoading(false);
            return;
        }

        // Filtrar y ordenar por relevancia
        const lowerTerm = term.toLowerCase();
        const cleanedRutTerm = term.replace(/[^0-9kK]/g, "");
        
        const scored = (data || []).map((acc: any) => {
            let score = 0;
            const nombre = (acc.nombre || "").toLowerCase();
            const apellidoPaterno = (acc.apellido_paterno || "").toLowerCase();
            const apellidoMaterno = (acc.apellido_materno || "").toLowerCase();
            const apellidosFull = [apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ");
            const nombreCompleto = [apellidoPaterno, apellidoMaterno, nombre].filter(Boolean).join(" ");
            const rut = (acc.rut || "").replace(/[^0-9kK]/g, "");
            
            // Match exacto tiene máxima prioridad
            if (nombre === lowerTerm) score += 100;
            if (apellidoPaterno === lowerTerm) score += 100;
            if (apellidoMaterno === lowerTerm) score += 100;
            if (apellidosFull === lowerTerm) score += 100;
            if (rut === cleanedRutTerm) score += 100;
            
            // Match al inicio tiene prioridad alta
            if (nombre.startsWith(lowerTerm)) score += 50;
            if (apellidoPaterno.startsWith(lowerTerm)) score += 50;
            if (apellidoMaterno.startsWith(lowerTerm)) score += 50;
            if (apellidosFull.startsWith(lowerTerm)) score += 50;
            if (nombreCompleto.startsWith(lowerTerm)) score += 50;
            if (rut.startsWith(cleanedRutTerm)) score += 50;
            
            // Match parcial tiene menor prioridad
            if (nombre.includes(lowerTerm)) score += 10;
            if (apellidoPaterno.includes(lowerTerm)) score += 10;
            if (apellidoMaterno.includes(lowerTerm)) score += 10;
            if (apellidosFull.includes(lowerTerm)) score += 10;
            if (rut.includes(cleanedRutTerm)) score += 10;
            
            return { acc, score };
        });
        
        // Filtrar solo los que tienen score > 0 y ordenar por score descendente
        const filtered = scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.acc);

        setSearchSuggestions(filtered);
        setIsSearchSuggestionsOpen(filtered.length > 0);
        setIsSearchLoading(false);
    };

    const handleOpenPdfPicker = () => {
        if (!accionistaId) {
            addToast({
                title: "Selecciona un accionista",
                description: "Debes elegir un accionista antes de adjuntar PDFs.",
                color: "warning",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
            return;
        }

        if (pdfInputRef.current) {
            pdfInputRef.current.click();
        }
    };

    const handleExportResumenAccionista = async () => {
        try {
            setIsExportTotalLoading(true);
            const ExcelJS = await import("exceljs");

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Resumen");

            // Columnas solicitadas:
            // 1) Registro
            // 2) Accionista (APELLIDO PATERNO + APELLIDO MATERNO + NOMBRES)
            // 3) RUT
            // 4) Fallecido (solo si tiene fecha de defunción)
            // 5) Saldo total
            worksheet.columns = [
                { header: "Registro", key: "registro", width: 14 },
                { header: "Accionista", key: "accionista", width: 32 },
                { header: "RUT", key: "rut", width: 18 },
                { header: "Fallecido", key: "fallecido", width: 12 },
                { header: "Saldo total", key: "saldo", width: 16 },
            ];

            // Filtrar por empresa si hay una seleccionada
            let query = supabase
                .from("accionistas")
                .select("*")
                .order("nombre", { ascending: true });
            
            if (currentEmpresaId) {
                query = query.eq("empresa_id", currentEmpresaId);
            }
            
            const { data: accionistas, error } = await query;

            if (error || !accionistas) {
                console.error("Error cargando accionistas para exportar:", error);
                addToast({
                    title: "Error al exportar",
                    description: "No se pudieron cargar los accionistas.",
                    color: "danger",
                    variant: "solid",
                    timeout: 2000,
                    shouldShowTimeoutProgress: true,
                });
                return;
            }

            // Obtener saldos finales de todos los accionistas desde API server
            const accionistasArr = accionistas as any[];
            const ids = accionistasArr.map((a) => a.id).filter(Boolean);
            let latestSaldoByAccionistaId: Record<string, number> = {};

            if (ids.length > 0) {
                try {
                    const res = await fetch("/api/movimientos/saldos", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ accionista_ids: ids }),
                    });

                    if (res.ok) {
                        const { saldos } = await res.json();
                        latestSaldoByAccionistaId = saldos || {};
                    } else {
                        console.error("Error cargando saldos desde API:", await res.text());
                    }
                } catch (err) {
                    console.error("Error al llamar API de saldos:", err);
                }
            }

            const rows: any[] = [];

            for (const a of accionistasArr) {
                const saldoFromMov = a.id ? latestSaldoByAccionistaId[String(a.id)] : undefined;
                const saldoFinal =
                    saldoFromMov != null
                        ? saldoFromMov
                        : a.saldo_acciones != null
                            ? a.saldo_acciones
                            : null;

                const fallecido = a.fecha_defuncion ? "Fallecido" : "";

                rows.push({
                    registro: a.registro || "-",
                    accionista:
                        [
                            [a.apellido_paterno, a.apellido_materno]
                                .filter(Boolean)
                                .join(" "),
                            a.nombre,
                        ]
                            .map((v: any) => v || "")
                            .filter((v: string) => v.trim().length > 0)
                            .join(" ") || "-",
                    rut: a.rut ? formatRut(String(a.rut)) : "-",
                    fallecido,
                    saldo: saldoFinal ?? "",
                });
            }

            worksheet.addRows(rows);

            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFE0E0E0" },
            };

            // Agregar filas informativas al final: fecha de exportación y total de accionistas
            const now = new Date();
            const dd = String(now.getDate()).padStart(2, "0");
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const yyyy = now.getFullYear();
            const fechaExport = `${dd}-${mm}-${yyyy}`;

            const infoRowFecha = worksheet.addRow({
                registro: `Fecha de exportación: ${fechaExport}`,
            });
            infoRowFecha.font = { italic: true };

            const totalRow = worksheet.addRow({
                registro: `Total accionistas: ${rows.length}`,
            });
            totalRow.font = { italic: true };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;

            // Incluir fecha en el nombre del archivo
            link.download = `accionistas_resumen_total_${yyyy}${mm}${dd}.xlsx`;

            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exportando resumen:", error);
            addToast({
                title: "Error al exportar",
                description: "No se pudo generar el archivo Excel.",
                color: "danger",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
        }
        finally {
            setIsExportTotalLoading(false);
        }
    };

    const handleExportListaPresente = async () => {
        try {
            setIsExportPresenteLoading(true);

            let query = supabase
                .from("accionistas")
                .select(
                    "id, nombre, apellido_paterno, apellido_materno, rut, email, fono, saldo_acciones"
                )
                .order("apellido_paterno", { ascending: true })
                .order("apellido_materno", { ascending: true })
                .order("nombre", { ascending: true });

            if (currentEmpresaId) {
                query = query.eq("empresa_id", currentEmpresaId);
            }

            const { data: accionistas, error } = await query;

            if (error || !accionistas) {
                console.error("Error cargando accionistas para lista de presente:", error);
                addToast({
                    title: "Error al exportar",
                    description: "No se pudieron cargar los accionistas.",
                    color: "danger",
                    variant: "solid",
                    timeout: 2000,
                    shouldShowTimeoutProgress: true,
                });
                return;
            }

            // Calcular saldo final por accionista usando último movimiento (igual que en tarjeta dashboard)
            const accionistasArr = accionistas as any[];
            const ids = accionistasArr.map((a) => a.id).filter(Boolean);
            let latestSaldoByAccionistaId: Record<string, number> = {};

            if (ids.length > 0) {
                try {
                    const res = await fetch("/api/movimientos/saldos", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ accionista_ids: ids }),
                    });

                    if (res.ok) {
                        const { saldos } = await res.json();
                        latestSaldoByAccionistaId = saldos || {};
                    } else {
                        console.error("Error cargando saldos desde API:", await res.text());
                    }
                } catch (err) {
                    console.error("Error al llamar API de saldos:", err);
                }
            }

            const escapeHtml = (value: any) =>
                String(value ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\"/g, "&quot;")
                    .replace(/'/g, "&#039;");

            const now = new Date();
            const dd = String(now.getDate()).padStart(2, "0");
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const yyyy = now.getFullYear();
            const fecha = `${dd}-${mm}-${yyyy}`;
            const tituloEmpresa = currentEmpresaNombre ? ` - ${currentEmpresaNombre}` : "";

            const rowsHtml = accionistasArr
                .map((a: any, idx: number) => {
                    const numero = idx + 1;
                    const apellidoPaterno = a.apellido_paterno ?? "";
                    const apellidoMaterno = a.apellido_materno ?? "";
                    const nombres = a.nombre ?? "";
                    const rut = a.rut ? formatRut(String(a.rut)) : "";
                    const email = a.email ?? "";
                    const celular = a.fono ? formatPhone(String(a.fono)) : "";
                    // Usar saldo del último movimiento si existe, sino saldo_acciones
                    const saldoFromMov = a.id ? latestSaldoByAccionistaId[String(a.id)] : undefined;
                    const totalAcciones = saldoFromMov != null ? String(saldoFromMov) : (a.saldo_acciones ?? "");

                    return `
                        <tr>
                            <td class="c-num">${escapeHtml(numero)}</td>
                            <td>${escapeHtml(apellidoPaterno)}</td>
                            <td>${escapeHtml(apellidoMaterno)}</td>
                            <td>${escapeHtml(nombres)}</td>
                            <td class="c-rut">${escapeHtml(rut)}</td>
                            <td>${escapeHtml(email)}</td>
                            <td class="c-cel">${escapeHtml(celular)}</td>
                            <td class="c-acc">${escapeHtml(totalAcciones)}</td>
                            <td class="c-firma"></td>
                        </tr>
                    `;
                })
                .join("");

            const html = `
                <!doctype html>
                <html>
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <title>Lista de presente${escapeHtml(tituloEmpresa)} - ${escapeHtml(fecha)}</title>
                        <style>
                            @page { size: A4 landscape; margin: 12mm; }
                            body { font-family: Arial, Helvetica, sans-serif; color: #111; }
                            .header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 10px; }
                            .title { font-size: 16px; font-weight: 700; }
                            .meta { font-size: 12px; color: #444; }
                            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                            th, td { border: 1px solid #111; padding: 6px 6px; font-size: 10px; vertical-align: top; }
                            th { background: #f0f0f0; text-align: left; }
                            .c-num { width: 34px; text-align: center; }
                            .c-rut { width: 95px; }
                            .c-cel { width: 85px; }
                            .c-acc { width: 70px; text-align: right; }
                            .c-firma { width: 150px; }
                            tr { page-break-inside: avoid; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="title">Lista de presente${escapeHtml(tituloEmpresa)}</div>
                            <div class="meta">Fecha: ${escapeHtml(fecha)}</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th class="c-num">N°</th>
                                    <th>Apellido paterno</th>
                                    <th>Apellido materno</th>
                                    <th>Nombres</th>
                                    <th class="c-rut">RUT</th>
                                    <th>Email</th>
                                    <th class="c-cel">Celular</th>
                                    <th class="c-acc">Total acciones</th>
                                    <th class="c-firma">Firma</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </body>
                </html>
            `;

            // Crear iframe oculto para imprimir
            const iframe = document.createElement("iframe");
            iframe.style.position = "absolute";
            iframe.style.width = "0px";
            iframe.style.height = "0px";
            iframe.style.border = "none";
            iframe.style.visibility = "hidden"; // Ocultarlo visualmente pero dejarlo en el DOM para que renderice
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (doc) {
                doc.open();
                doc.write(html);
                doc.close();

                // Esperar a que cargue y luego imprimir
                iframe.contentWindow?.focus();
                setTimeout(() => {
                    iframe.contentWindow?.print();
                    // Remover el iframe después de un tiempo prudente (después de que el usuario cierre el diálogo)
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                    }, 2000);
                }, 500);
            } else {
                throw new Error("No se pudo acceder al documento del iframe de impresión.");
            }
        } catch (error) {
            console.error("Error exportando lista de presente:", error);
            addToast({
                title: "Error al exportar",
                description: "No se pudo generar el PDF.",
                color: "danger",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
        } finally {
            setIsExportPresenteLoading(false);
        }
    };

    const handlePdfChange = async (event: any) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (file.type !== "application/pdf") {
            addToast({
                title: "Archivo no válido",
                description: "Sólo se permiten archivos PDF.",
                color: "danger",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
            event.target.value = "";
            return;
        }

        // Validar tamaño máximo de 5MB
        const maxSize = 5 * 1024 * 1024; // 5MB en bytes
        if (file.size > maxSize) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            addToast({
                title: "Archivo muy grande",
                description: `El archivo pesa ${sizeMB}MB. El tamaño máximo es 5MB.`,
                color: "danger",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
            event.target.value = "";
            return;
        }

        if (!accionistaId) {
            addToast({
                title: "Error",
                description: "No hay accionista seleccionado.",
                color: "danger",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
            event.target.value = "";
            return;
        }

        try {
            setIsDocumentsLoading(true);
            // Nombre del archivo en Storage: accionista_{id}.pdf
            const fileName = `accionista_${accionistaId}.pdf`;
            const filePath = `${fileName}`;

            // Subir archivo a Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("documentos")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: true, // Reemplazar si ya existe
                });

            if (uploadError) {
                console.error("Error subiendo PDF:", uploadError);
                addToast({
                    title: "Error al subir",
                    description: uploadError.message,
                    color: "danger",
                    variant: "solid",
                    timeout: 2000,
                    shouldShowTimeoutProgress: true,
                });
                event.target.value = "";
                return;
            }

            // Obtener URL firmada del archivo (válida por 1 año para bucket privado)
            const { data: urlData, error: urlError } = await supabase.storage
                .from("documentos")
                .createSignedUrl(filePath, 31536000); // 1 año en segundos

            if (urlError || !urlData) {
                console.error("Error generando URL:", urlError);
                addToast({
                    title: "Error al generar URL",
                    description: "No se pudo generar la URL del PDF.",
                    color: "danger",
                    variant: "solid",
                    timeout: 2000,
                    shouldShowTimeoutProgress: true,
                });
                event.target.value = "";
                return;
            }

            const publicUrl = urlData.signedUrl;

            // Actualizar la tabla accionistas con la URL del PDF
            const { error: updateError } = await supabase
                .from("accionistas")
                .update({ pdf_url: publicUrl })
                .eq("id", accionistaId);

            if (updateError) {
                console.error("Error actualizando accionista:", updateError);
                addToast({
                    title: "Error al guardar",
                    description: "El PDF se subió pero no se pudo guardar la referencia.",
                    color: "warning",
                    variant: "solid",
                    timeout: 2000,
                    shouldShowTimeoutProgress: true,
                });
            } else {
                // Actualizar estado local
                setAccionistaPdfUrl(publicUrl);

                addToast({
                    title: "PDF subido",
                    description: file.name,
                    color: "success",
                    variant: "solid",
                    timeout: 2000,
                    shouldShowTimeoutProgress: true,
                });
            }
        } catch (error) {
            console.error("Error en handlePdfChange:", error);
            addToast({
                title: "Error inesperado",
                description: "No se pudo subir el PDF.",
                color: "danger",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
        } finally {
            setIsDocumentsLoading(false);
        }

        event.target.value = "";
    };

    const handleDownloadPdf = () => {
        if (!accionistaPdfUrl) {
            addToast({
                title: "Sin documento",
                description: "No hay PDF disponible para este accionista.",
                color: "warning",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
            return;
        }

        // Abrir el PDF en una nueva pestaña
        window.open(accionistaPdfUrl, "_blank");
    };

    const handleExportToExcel = async () => {
        if (!accionistaId) {
            addToast({
                title: "Selecciona un accionista",
                description: "Debes elegir un accionista antes de exportar.",
                color: "warning",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
            return;
        }

        try {
            // Importar dinámicamente la librería exceljs
            const ExcelJS = await import("exceljs");

            // Crear workbook y worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Accionista");

            // Definir columnas: un campo por columna
            worksheet.columns = [
                { header: "Nombre", key: "nombre", width: 20 },
                { header: "Apellido paterno", key: "apellidoPaterno", width: 18 },
                { header: "Apellido materno", key: "apellidoMaterno", width: 18 },
                { header: "RUT", key: "rut", width: 18 },
                { header: "Nacionalidad", key: "nacionalidad", width: 18 },
                { header: "Dirección", key: "direccion", width: 30 },
                { header: "Ciudad", key: "ciudad", width: 18 },
                { header: "Registro", key: "registro", width: 14 },
                { header: "Fono", key: "fono", width: 18 },
                { header: "Fecha defunción", key: "fechaDefuncion", width: 18 },
                { header: "Fallecido", key: "fallecido", width: 12 },
                { header: "Saldo", key: "saldo", width: 15 },
            ];

            // Calcular saldo final
            const saldoFinal =
                movimientos.length > 0
                    ? movimientos[movimientos.length - 1].saldo
                    : accionista.saldo ?? "-";

            // Agregar una sola fila con los valores del accionista (sin firma)
            worksheet.addRow({
                nombre: accionista.nombre || "-",
                apellidoPaterno: accionista.apellidoPaterno || "-",
                apellidoMaterno: accionista.apellidoMaterno || "-",
                rut: accionista.rut || "-",
                nacionalidad: accionista.nacionalidad || "-",
                direccion: accionista.direccion || "-",
                ciudad: accionista.ciudad || "-",
                registro: accionista.registro || "-",
                fono: accionista.fono || "-",
                fechaDefuncion: accionista.fechaDefuncion || "-",
                fallecido: accionista.fechaDefuncion && accionista.fechaDefuncion !== "-" ? "Fallecido" : "",
                saldo: saldoFinal,
            });

            // Estilo del encabezado
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFE0E0E0" },
            };

            // Generar buffer y descargar
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            
            // Nombre del archivo: "Nombre ApellidoPaterno ApellidoMaterno_datos_exportados.xlsx"
            const nombreCompleto = [accionista.nombre, accionista.apellidoPaterno, accionista.apellidoMaterno]
                .filter(Boolean)
                .join(" ") || "accionista";
            link.download = `${nombreCompleto}_datos_exportados.xlsx`;
            
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exportando a Excel:", error);
            addToast({
                title: "Error al exportar",
                description: "No se pudo generar el archivo Excel.",
                color: "danger",
                variant: "solid",
                timeout: 2000,
                shouldShowTimeoutProgress: true,
            });
        }
    };

    useEffect(() => {
        setIsTableMounted(true);
        setIsClientMounted(true);

        const fetchData = async () => {
            // No cargar datos si no hay empresa seleccionada
            if (!currentEmpresaId) {
                return;
            }

            // 1) Si hay un accionista seleccionado por lista/autocomplete, cargarlo por ID exacto
            let accionistas: any[] | null = null;
            let error: any = null;

            if (selectedAccionistaId) {
                const result = await supabase
                    .from("accionistas")
                    .select("*")
                    .eq("empresa_id", currentEmpresaId)
                    .eq("id", selectedAccionistaId)
                    .limit(1);
                accionistas = result.data as any[] | null;
                error = result.error;
            } else {
                // 2) Buscar accionista según searchTerm (RUT / nombre). Si no hay término, tomar el primero.
                // Filtrar siempre por empresa_id
                let accionistasQuery = supabase
                    .from("accionistas")
                    .select("*")
                    .eq("empresa_id", currentEmpresaId);

                const trimmed = debouncedSearchTerm.trim();
                if (trimmed.length > 0) {
                    // Limpiar el RUT para buscar sin formato
                    const cleanedRut = cleanRut(trimmed);
                    
                    // Buscar en todos los campos de forma flexible (case-insensitive, parcial)
                    // ilike busca sin importar mayúsculas/minúsculas
                    accionistasQuery = accionistasQuery.or(
                        `rut.ilike.%${cleanedRut}%,nombre.ilike.%${trimmed}%,apellido_paterno.ilike.%${trimmed}%,apellido_materno.ilike.%${trimmed}%`,
                    );
                }

                const result = await accionistasQuery
                    .limit(100); // Traer hasta 100 resultados para luego filtrar el mejor match
                accionistas = result.data as any[] | null;
                error = result.error;
            }

            if (!error && accionistas && accionistas.length > 0) {
                // Encontrar el mejor match basado en relevancia
                let bestMatch = accionistas[0];
                
                const trimmed = debouncedSearchTerm.trim();
                if (!selectedAccionistaId && trimmed.length > 0 && accionistas.length > 1) {
                    const lowerTrimmed = trimmed.toLowerCase();
                    const cleanedRut = cleanRut(trimmed);
                    
                    // Calcular score de relevancia para cada accionista
                    const scored = accionistas.map((acc: any) => {
                        let score = 0;
                        const nombre = (acc.nombre || "").toLowerCase();
                        const apellidosFull = (
                            [acc.apellido_paterno, acc.apellido_materno]
                                .filter(Boolean)
                                .join(" ")
                        ).toLowerCase();
                        const rut = cleanRut(acc.rut || "");
                        
                        // Match exacto tiene mayor prioridad
                        if (nombre === lowerTrimmed) score += 100;
                        if (apellidosFull === lowerTrimmed) score += 100;
                        if (rut === cleanedRut) score += 100;
                        
                        // Match al inicio tiene prioridad media
                        if (nombre.startsWith(lowerTrimmed)) score += 50;
                        if (apellidosFull.startsWith(lowerTrimmed)) score += 50;
                        if (rut.startsWith(cleanedRut)) score += 50;
                        
                        // Match parcial tiene menor prioridad
                        if (nombre.includes(lowerTrimmed)) score += 10;
                        if (apellidosFull.includes(lowerTrimmed)) score += 10;
                        if (rut.includes(cleanedRut)) score += 10;
                        
                        return { acc, score };
                    });
                    
                    // Ordenar por score descendente y tomar el mejor
                    scored.sort((a, b) => b.score - a.score);
                    bestMatch = scored[0].acc;
                }
                
                const a: any = bestMatch;

                setAccionista({
                    nombre: a.nombre ?? "",
                    apellidoPaterno: a.apellido_paterno ?? "",
                    apellidoMaterno: a.apellido_materno ?? "",
                    rut: a.rut ? formatRut(a.rut) : "",
                    nacionalidad: a.nacionalidad ?? "",
                    direccion: a.direccion ?? "",
                    ciudad: a.ciudad ?? "",
                    email: a.email ?? "",
                    registro: a.registro ?? "-",
                    fono: a.fono ? formatPhone(a.fono) : "",
                    fechaDefuncion:
                        a.fecha_defuncion
                            ? (() => {
                                  const d = new Date(a.fecha_defuncion);
                                  const dd = String(d.getDate()).padStart(2, "0");
                                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                                  const yyyy = d.getFullYear();
                                  return `${dd} - ${mm} - ${yyyy}`;
                              })()
                            : "-",
                    saldo:
                        a.saldo_acciones != null
                            ? `${a.saldo_acciones} acciones`
                            : "-",
                    firma: a.firma ?? "",
                });

                setAccionistaId(a.id ?? null);
                setAccionistaPdfUrl(a.pdf_url ?? null);

                // 2) Paginación de movimientos para ese accionista
                const from = movimientosPage * MOV_PAGE_SIZE;

                const res = await fetch(
                    `/api/movimientos?accionista_id=${encodeURIComponent(a.id)}&page=${movimientosPage}&page_size=${MOV_PAGE_SIZE}`,
                );

                if (!res.ok) {
                    let message = "No se pudieron cargar los movimientos.";
                    try {
                        const body = await res.json();
                        if (body?.error) message = body.error;
                    } catch {
                        // ignore
                    }
                    console.error("Error loading movimientos:", message);
                    setMovimientos([]);
                    setMovimientosTotal(0);
                    return;
                }

                const { data: movs, count } = await res.json();

                if (movs) {
                    const mapped = movs.map((m: any, index: number) => ({
                        id: m.id,
                        displayId: from + index + 1,
                        fecha: m.fecha_transferencia
                            ? (() => {
                                  const d = new Date(m.fecha_transferencia);
                                  const dd = String(d.getUTCDate()).padStart(2, "0");
                                  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
                                  const yyyy = d.getUTCFullYear();
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
    }, [debouncedSearchTerm, movimientosPage, currentEmpresaId, selectedAccionistaId]);

    const handleOpenCreateRegistro = () => {
        // Limpiar accionistaId para asegurar que se cree un nuevo registro
        setAccionistaId(null);
        setRegistroDraft({
            nombre: "",
            apellidoPaterno: "",
            apellidoMaterno: "",
            rut: "",
            nacionalidad: "",
            direccion: "",
            ciudad: "",
            email: "",
            registro: "",
            fono: "+56 ",
            fechaDefuncion: "",
            fallecido: false,
            saldo: "",
            firma: "",
        });
        setIsRegistroOpen(true);
    };

    const handleOpenEditRegistro = () => {
        // Si no hay accionista real seleccionado, no hacemos nada
        if (!accionistaId) {
            return;
        }

        // Convertir la fecha de defunción mostrada (dd - mm - aaaa) a formato ISO simple (aaaa-mm-dd)
        const fechaDefuncionIso =
            accionista.fechaDefuncion && accionista.fechaDefuncion !== "-"
                ? (() => {
                      const parts = accionista.fechaDefuncion.split(" - ");
                      if (parts.length === 3) {
                          const [dd, mm, yyyy] = parts;
                          return `${yyyy}-${mm}-${dd}`;
                      }
                      return "";
                  })()
                : "";

        const saldoSoloNumero = (() => {
            // Misma lógica que la tarjeta: si hay movimientos, usamos el saldo del último,
            // si no, usamos el saldo del accionista.
            const saldoTexto =
                movimientos.length > 0
                    ? movimientos[movimientos.length - 1].saldo
                    : accionista.saldo;

            if (!saldoTexto) return "";
            const match = String(saldoTexto).match(/\d+/);
            return match ? match[0] : "";
        })();

        const draftData = {
            nombre: accionista.nombre || "",
            apellidoPaterno: accionista.apellidoPaterno || "",
            apellidoMaterno: accionista.apellidoMaterno || "",
            rut: accionista.rut || "",
            nacionalidad: accionista.nacionalidad || "",
            direccion: accionista.direccion || "",
            ciudad: accionista.ciudad || "",
            email: accionista.email || "",
            registro: accionista.registro || "",
            fono: accionista.fono || "+56 ",
            fechaDefuncion: fechaDefuncionIso,
            fallecido: !!fechaDefuncionIso,
            saldo: saldoSoloNumero,
            firma: accionista.firma || "",
        };
        
        setRegistroDraft(draftData);
        // Guardar estado original para detectar cambios después
        setAccionistaOriginal({ ...draftData });
        setIsRegistroOpen(true);
    };

    const handleDeleteAccionista = async () => {
        const idToDelete = selectedAccionistaId ?? accionistaId;
        if (!idToDelete) return;

        try {
            setIsDeletingAccionista(true);

            const res = await fetch(`/api/accionistas/${idToDelete}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                let message = "No se pudo eliminar el accionista.";
                try {
                    const body = await res.json();
                    if (body?.error) message = body.error;
                } catch {
                    // ignore
                }
                throw new Error(message);
            }

            const nombreCompleto = [accionista.nombre, accionista.apellidoPaterno, accionista.apellidoMaterno]
                .filter(Boolean)
                .join(" ");
            await logActivity("eliminar", "accionista", idToDelete, nombreCompleto);

            addToast({
                title: "Accionista eliminado",
                description: "El accionista y sus movimientos fueron eliminados correctamente.",
                color: "success",
                variant: "solid",
                timeout: 3000,
                shouldShowTimeoutProgress: true,
            });

            setAccionista(emptyAccionista);
            setAccionistaId(null);
            setSelectedAccionistaId(null);
            setSearchTerm("");
            setMovimientos([]);
            setMovimientosTotal(0);
            setIsDeleteAccionistaOpen(false);
        } catch (error) {
            console.error("Error eliminando accionista:", error);
            addToast({
                title: "Error al eliminar",
                description:
                    error instanceof Error
                        ? error.message
                        : "No se pudo eliminar el accionista.",
                color: "danger",
                variant: "solid",
                timeout: 3000,
                shouldShowTimeoutProgress: true,
            });
        } finally {
            setIsDeletingAccionista(false);
        }
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
                apellido_paterno: registroDraft.apellidoPaterno || null,
                apellido_materno: registroDraft.apellidoMaterno || null,
                nacionalidad: registroDraft.nacionalidad || null,
                direccion: registroDraft.direccion || null,
                ciudad: registroDraft.ciudad || null,
                email: registroDraft.email || null,
                registro: registroDraft.registro || null,
                fono: registroDraft.fono ? cleanPhone(registroDraft.fono) : null,
                fecha_defuncion: registroDraft.fechaDefuncion || null,
                saldo_acciones: saldoNumber,
                firma: registroDraft.firma || null,
            };

            if (registroDraft.rut && registroDraft.rut.trim().length > 0) {
                // Limpiar el RUT antes de guardarlo (sin puntos ni guión)
                payload.rut = cleanRut(registroDraft.rut);
            }

            let data: any = null;
            let error: any = null;
            const isCreating = !accionistaId;

            if (accionistaId) {
                // Modo edición: actualizar registro existente por id
                const response = await supabase
                    .from("accionistas")
                    .update(payload)
                    .eq("id", accionistaId)
                    .select("*")
                    .single();

                data = response.data;
                error = response.error;
            } else {
                // Modo creación: insertar nuevo registro con empresa_id
                const response = await supabase
                    .from("accionistas")
                    .insert({
                        ...payload,
                        empresa_id: currentEmpresaId,
                    })
                    .select("*")
                    .single();

                data = response.data;
                error = response.error;
            }

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
            const apellidosTexto =
                [a.apellido_paterno, a.apellido_materno]
                    .filter(Boolean)
                    .join(" ");

            setAccionista({
                nombre: a.nombre ?? "",
                apellidoPaterno: a.apellido_paterno ?? "",
                apellidoMaterno: a.apellido_materno ?? "",
                rut: a.rut ? formatRut(a.rut) : "",
                nacionalidad: a.nacionalidad ?? "",
                direccion: a.direccion ?? "",
                ciudad: a.ciudad ?? "",
                email: a.email ?? "",
                registro: a.registro ?? "-",
                fono: a.fono ? formatPhone(a.fono) : "",
                fechaDefuncion:
                    a.fecha_defuncion
                        ? (() => {
                              const d = new Date(a.fecha_defuncion);
                              const dd = String(d.getDate()).padStart(2, "0");
                              const mm = String(d.getMonth() + 1).padStart(2, "0");
                              const yyyy = d.getFullYear();
                              return `${dd} - ${mm} - ${yyyy}`;
                          })()
                        : "-",
                saldo:
                    a.saldo_acciones != null
                        ? `${a.saldo_acciones} acciones`
                        : "-",
                firma: a.firma ?? "",
            });

            setAccionistaId(a.id ?? null);
            setAccionistaPdfUrl(a.pdf_url ?? null);
            setMovimientos([]);
            setMovimientosPage(0);
            setIsRegistroOpen(false);
            
            // Registrar actividad
            if (a.id) {
                const nombreCompleto = [a.nombre, apellidosTexto].filter(Boolean).join(" ") || "Sin nombre";
                const action = isCreating ? "crear_accionista" : "editar_accionista";
                
                // Detectar cambios si es edición
                let changesText: string | undefined;
                if (!isCreating && accionistaOriginal) {
                    const fieldLabels: Record<string, string> = {
                        nombre: "Nombre",
                        apellidoPaterno: "Apellido paterno",
                        apellidoMaterno: "Apellido materno",
                        rut: "RUT",
                        nacionalidad: "Nacionalidad",
                        direccion: "Dirección",
                        ciudad: "Ciudad",
                        registro: "Registro",
                        fono: "Teléfono",
                        fechaDefuncion: "Fecha defunción",
                        saldo: "Saldo",
                        firma: "Firma",
                    };
                    
                    const changes: string[] = [];
                    for (const key of Object.keys(fieldLabels)) {
                        const oldVal = accionistaOriginal[key] || "";
                        const newVal = (registroDraft as any)[key] || "";
                        if (oldVal !== newVal) {
                            changes.push(`${fieldLabels[key]}: "${oldVal}" → "${newVal}"`);
                        }
                    }
                    
                    if (changes.length > 0) {
                        changesText = changes.join("; ");
                    }
                }
                
                await logActivity(action, "accionista", a.id, nombreCompleto, changesText);
                setAccionistaOriginal(null); // Limpiar después de guardar
            }
            
            // Forzar recarga de datos actualizando searchTerm con el RUT del accionista
            // Esto dispara el useEffect y carga correctamente los movimientos
            if (a.rut) {
                setSearchTerm(formatRut(a.rut));
            } else if (a.nombre) {
                setSearchTerm(a.nombre);
            }
            
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
            const payload = {
                accionista_id: accionistaId,
                fecha_transferencia: movimientoFecha
                    ? new Date(
                          Date.UTC(
                              Number(movimientoFecha.year),
                              Number(movimientoFecha.month) - 1,
                              Number(movimientoFecha.day),
                          )
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
            };

            const res = await fetch("/api/movimientos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let message = "No se pudo guardar el movimiento.";
                try {
                    const body = await res.json();
                    if (body?.error) message = body.error;
                } catch {
                    // ignore
                }
                throw new Error(message);
            }

            const { data } = await res.json();
            if (!data) {
                throw new Error("Respuesta inválida del servidor");
            }

            // Actualizar la lista local de movimientos con el nuevo registro
            const newRow = {
                id: data.id,
                displayId: movimientos.length ? Math.max(...movimientos.map((row) => row.displayId || 0)) + 1 : 1,
                fecha: data.fecha_transferencia
                    ? (() => {
                          const d = new Date(data.fecha_transferencia);
                          const dd = String(d.getUTCDate()).padStart(2, "0");
                          const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
                          const yyyy = d.getUTCFullYear();
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

            // Registrar actividad del traspaso
            if (data.id) {
                const descripcion = data.numero_transferencia 
                    ? `Traspaso #${data.numero_transferencia}` 
                    : `Traspaso del ${newRow.fecha}`;
                await logActivity("crear_traspaso", "movimiento", data.id, descripcion);
            }

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

    const handleMovimientosKeyDownCapture = (event: any) => {
        if (!isEditMode) return;

        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
            return;
        }

        const target = event.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") {
            event.stopPropagation();
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

        // Actualizar en servidor
        try {
            const payload = {
                id: editingRowId,
                fecha_transferencia: updatedRow.fecha !== "-" 
                    ? (() => {
                        const parts = updatedRow.fecha.split(" - ");
                        if (parts.length === 3) {
                            const [dd, mm, yyyy] = parts;
                            return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd))).toISOString();
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
            };

            const res = await fetch("/api/movimientos", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let message = "No se pudo guardar el movimiento en la base de datos.";
                try {
                    const body = await res.json();
                    if (body?.error) message = body.error;
                } catch {
                    // ignore
                }
                throw new Error(message);
            }

            // Registrar actividad de edición con cambios detectados
            const descripcion = updatedRow.transferencia !== "-"
                ? `Traspaso #${updatedRow.transferencia}`
                : `Traspaso del ${updatedRow.fecha}`;
            
            // Detectar cambios comparando con editingMovimiento (estado original)
            let changesText: string | undefined;
            if (editingMovimiento) {
                const fieldLabels: Record<string, string> = {
                    fecha: "Fecha",
                    transferencia: "N° Transferencia",
                    tituloAnulado: "Título inutilizado",
                    compradoA: "Comprado a",
                    vendidoA: "Vendido a",
                    tituloNuevoComprador: "Título nuevo comprador",
                    tituloNuevoVendedor: "Título nuevo vendedor",
                    compras: "Compras",
                    ventas: "Ventas",
                    saldo: "Saldo",
                    observaciones: "Observaciones",
                    tituloEmitido: "Título emitido",
                };
                
                const changes: string[] = [];
                for (const key of Object.keys(fieldLabels)) {
                    const oldVal = editingMovimiento[key] || "-";
                    const newVal = updatedRow[key] || "-";
                    if (oldVal !== newVal) {
                        changes.push(`${fieldLabels[key]}: "${oldVal}" → "${newVal}"`);
                    }
                }
                
                if (changes.length > 0) {
                    changesText = changes.join("; ");
                }
            }
            
            await logActivity("editar_traspaso", "movimiento", String(editingRowId), descripcion, changesText);

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

            {/* Input oculto para seleccionar PDFs */}
            <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfChange}
            />

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
                                <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl flex items-center gap-3">
                                    {currentEmpresaNombre || "Selecciona una empresa"}
                                    {currentEmpresaRut && (
                                        <span className="text-base font-normal text-gray-500">
                                            {currentEmpresaRut}
                                        </span>
                                    )}
                                </h1>
                            </div>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <div className="relative md:w-80 lg:w-96">
                                    <SearchInput
                                            id="search-input"
                                            ref={searchInputRef}
                                            label="Buscar"
                                            radius="sm"
                                            variant="bordered"
                                            placeholder="Buscar por nombre, apellido o RUT..."
                                            classNames={{
                                                inputWrapper: "bg-white border-gray-200",
                                                input: "text-black placeholder:text-gray-400",
                                            }}
                                            value={searchTerm}
                                            onValueChange={handleSearchChange}
                                            onBlur={() => {
                                                // Dar un pequeño margen para permitir el click en las sugerencias
                                                setTimeout(() => {
                                                    setIsSearchSuggestionsOpen(false);
                                                }, 150);
                                            }}
                                            onFocus={() => {
                                                if (searchSuggestions.length > 0) {
                                                    setIsSearchSuggestionsOpen(true);
                                                }

                                                const el = searchInputRef.current;
                                                if (el) {
                                                    const len = el.value.length;
                                                    // Mover el cursor al final del texto
                                                    requestAnimationFrame(() => {
                                                        try {
                                                            el.setSelectionRange(len, len);
                                                        } catch {
                                                            // ignorar si el navegador no lo permite
                                                        }
                                                    });
                                                }
                                            }}
                                    />
                                    {isSearchSuggestionsOpen && (
                                        <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto pr-1 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100">
                                            {isSearchLoading ? (
                                                <div className="flex justify-center py-3">
                                                    <Spinner size="sm" />
                                                </div>
                                            ) : searchSuggestions.length === 0 ? (
                                                <p className="px-3 py-2 text-xs text-gray-500">
                                                    No se encontraron coincidencias.
                                                </p>
                                            ) : (
                                                searchSuggestions.map((acc) => (
                                                    <button
                                                        key={acc.id}
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 cursor-pointer"
                                                        onClick={() => handleSelectAccionistaFromList(acc)}
                                                    >
                                                        <p className="font-medium text-gray-900">
                                                            {[acc.apellido_paterno, acc.apellido_materno, acc.nombre]
                                                                .filter(Boolean)
                                                                .join(" ") || "Sin nombre"}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500">
                                                            {acc.rut
                                                                ? formatRut(String(acc.rut))
                                                                : "RUT no registrado"}
                                                            {acc.registro
                                                                ? ` · Registro: ${acc.registro}`
                                                                : ""}
                                                        </p>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 md:flex-none">
                                    <Button
                                        className="text-black"
                                        radius="sm"
                                        variant="shadow"
                                        color="success"
                                        onPress={handleOpenCreateRegistro}
                                    >
                                        Crear accionista
                                    </Button>
                                    <Button
                                        radius="sm"
                                        variant="shadow"
                                        color="primary"
                                        onPress={() => router.push("/admin/users")}
                                    >
                                        Crear usuario
                                    </Button>
                                    <Dropdown>
                                        <DropdownTrigger>
                                            <Button
                                                radius="sm"
                                                variant="shadow"
                                                color="warning"
                                                className="text-black"
                                            >
                                                Configurar
                                            </Button>
                                        </DropdownTrigger>
                                        <DropdownMenu aria-label="Opciones de configuración">
                                            <DropdownItem
                                                key="view-logs"
                                                onPress={() => router.push("/admin/logs")}
                                            >
                                                Ver logs
                                            </DropdownItem>
                                            <DropdownItem
                                                key="select-shareholder"
                                                onPress={handleOpenSelectAccionista}
                                            >
                                                Seleccionar accionista
                                            </DropdownItem>
                                        </DropdownMenu>
                                    </Dropdown>
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
                                        color="warning"
                                        onPress={() => {
                                            document.cookie = "current_empresa_id=; path=/; max-age=0";
                                            document.cookie = "current_empresa_nombre=; path=/; max-age=0";
                                            router.push("/select-empresa");
                                        }}
                                    >
                                        Cambiar empresa
                                    </Button>
                                    <Button
                                        radius="sm"
                                        size="sm"
                                        variant="shadow"
                                        color="danger"
                                        onPress={() => {
                                            document.cookie = "logged_in=; path=/; max-age=0";
                                            document.cookie = "current_user=; path=/; max-age=0";
                                            document.cookie = "current_empresa_id=; path=/; max-age=0";
                                            document.cookie = "current_empresa_nombre=; path=/; max-age=0";
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
                                {
                                    [accionista.nombre, accionista.apellidoPaterno, accionista.apellidoMaterno]
                                        .filter(Boolean)
                                        .join(" ") || "-"
                                }
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Apellido paterno</p>
                                    <p className="text-sm text-gray-900">{accionista.apellidoPaterno || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Apellido materno</p>
                                    <p className="text-sm text-gray-900">{accionista.apellidoMaterno || "-"}</p>
                                </div>
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
                                    <p className="text-[11px] text-gray-500">Email</p>
                                    <p className="text-sm text-gray-900">{accionista.email || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Registro</p>
                                    <p className="text-sm text-gray-900">{accionista.registro || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Fono</p>
                                    <p className="text-sm text-gray-900">{accionista.fono || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] text-gray-500">Fecha defunción</p>
                                    <p className="text-sm text-gray-900">
                                        {accionista.fechaDefuncion || "-"}
                                    </p>
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
                            <div className="mt-2 flex justify-end gap-2">
                                <Dropdown isDisabled={isDocumentsLoading}>
                                    <DropdownTrigger>
                                        <Button
                                            radius="sm"
                                            size="sm"
                                            variant="shadow"
                                            color="primary"
                                        >
                                            {isDocumentsLoading ? (
                                                <div className="flex items-center gap-2">
                                                    <Spinner size="sm" color="white" />
                                                    <span>Procesando...</span>
                                                </div>
                                            ) : (
                                                "Documentos"
                                            )}
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownMenu
                                        aria-label="Acciones de documentos del accionista"
                                        variant="faded"
                                    >
                                        <DropdownItem
                                            key="upload-pdf"
                                            startContent={<AddNoteIcon className={iconClasses} />}
                                            onPress={handleOpenPdfPicker}
                                        >
                                            Subir PDF
                                        </DropdownItem>
                                        <DropdownItem
                                            key="download-pdf"
                                            startContent={<DownloadIcon className={iconClasses} />}
                                            onPress={handleDownloadPdf}
                                            isDisabled={!accionistaPdfUrl}
                                        >
                                            Descargar PDF
                                        </DropdownItem>
                                        <DropdownItem
                                            key="export-excel"
                                            startContent={<ExportIcon className={iconClasses} />}
                                            onPress={handleExportToExcel}
                                        >
                                            Exportar a Excel
                                        </DropdownItem>
                                    </DropdownMenu>
                                </Dropdown>
                                <Button
                                    className="text-black"
                                    radius="sm"
                                    size="sm"
                                    variant="shadow"
                                    color="warning"
                                    onPress={handleOpenEditRegistro}
                                >
                                    Editar accionista
                                </Button>
                                <Button
                                    className="text-white"
                                    radius="sm"
                                    size="sm"
                                    variant="shadow"
                                    color="danger"
                                    isDisabled={!accionistaId}
                                    onPress={() => setIsDeleteAccionistaOpen(true)}
                                >
                                    Eliminar
                                </Button>
                            </div>

                            {/* Firma del accionista */}
                            <div className="mt-3 border-t border-dashed border-gray-200 pt-3">
                                <p className="text-[11px] text-gray-500">Firma accionista</p>
                                <div className="mt-2 flex flex-col items-center gap-1">
                                    <div className="h-10 w-full max-w-xs rounded-md border border-gray-200 bg-white px-4 py-1.5">
                                        <p className="text-lg font-semibold text-gray-700 italic font-[cursive] tracking-wide">
                                            {
                                                [accionista.nombre, accionista.apellidoPaterno, accionista.apellidoMaterno]
                                                    .filter(Boolean)
                                                    .join(" ") || "-"
                                            }
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
                                    Agregar traspaso
                                </Button>
                                <Button
                                    size="sm"
                                    radius="sm"
                                    variant="bordered"
                                    color="primary"
                                    isDisabled={isExportPresenteLoading}
                                    onPress={handleExportListaPresente}
                                >
                                    {isExportPresenteLoading ? (
                                        <div className="flex items-center gap-2">
                                            <Spinner size="sm" />
                                            <span>Exportando...</span>
                                        </div>
                                    ) : (
                                        "Lista presente"
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    radius="sm"
                                    variant={isEditMode ? "solid" : "shadow"}
                                    color={isEditMode ? "warning" : "primary"}
                                    onPress={() => {
                                        setIsEditMode((prev) => !prev);
                                        setEditingRowId(null);
                                        setEditingMovimiento(null);
                                        setIsConfirmEditOpen(false);
                                    }}
                                >
                                    {isEditMode ? "Salir de edición" : "Editar"}
                                </Button>
                                <Button
                                    size="sm"
                                    radius="sm"
                                    variant="bordered"
                                    color="primary"
                                    isDisabled={isExportTotalLoading}
                                    onPress={handleExportResumenAccionista}
                                >
                                    {isExportTotalLoading ? (
                                        <div className="flex items-center gap-2">
                                            <Spinner size="sm" />
                                            <span>Exportando...</span>
                                        </div>
                                    ) : (
                                        "Exportar total"
                                    )}
                                </Button>
                                <p>
                                    Total registros: <span className="font-semibold text-gray-800">{movimientos.length}</span>
                                </p>
                            </div>
                        </div>

                        <div
                            className="flex-1 overflow-y-auto overflow-x-auto"
                            onKeyDownCapture={handleMovimientosKeyDownCapture}
                        >
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
                                        <TableColumn className="min-w-[6.75rem]">
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
                                        <TableColumn className="w-[7.5rem]">COMPRAS</TableColumn>
                                        <TableColumn className="w-[7.5rem]">VENTAS</TableColumn>
                                        <TableColumn className="w-[7.5rem]">SALDO</TableColumn>
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
                                                                className="w-[7.25rem]"
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
                                            {accionistaId
                                                ? "Editar registro (página del libro)"
                                                : "Crear registro (página del libro)"}
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
                                                    label="Apellido paterno"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.apellidoPaterno}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            apellidoPaterno: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Apellido materno"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.apellidoMaterno}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            apellidoMaterno: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="RUT"
                                                    variant="bordered"
                                                    placeholder="Ej: 12.345.678-9"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-grey",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.rut}
                                                    onValueChange={(value) => {
                                                        const formatted = formatRut(value);
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            rut: formatted,
                                                        }));
                                                    }}
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
                                                    label="Email"
                                                    variant="bordered"
                                                    placeholder="correo@ejemplo.com"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.email}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            email: value,
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    label="Registro"
                                                    variant="bordered"
                                                    classNames={{
                                                        inputWrapper:
                                                            "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                        input:
                                                            "text-black placeholder:!text-black",
                                                        label: "text-gray-700",
                                                    }}
                                                    value={registroDraft.registro}
                                                    onValueChange={(value) =>
                                                        setRegistroDraft((prev) => ({
                                                            ...prev,
                                                            registro: value,
                                                        }))
                                                    }
                                                />
                                                <div>
                                                    <Input
                                                        label="Fono"
                                                        variant="bordered"
                                                        classNames={{
                                                            inputWrapper:
                                                                "bg-white border-gray-300 hover:border-gray-400 data-[focus=true]:border-gray-500",
                                                            input:
                                                                "text-black",
                                                            label: "text-gray-700",
                                                        }}
                                                        value={registroDraft.fono || "+56 "}
                                                        onValueChange={(value) => {
                                                            // No permitir borrar el prefijo +56
                                                            if (!value.startsWith("+56")) {
                                                                setRegistroDraft((prev) => ({
                                                                    ...prev,
                                                                    fono: "+56 ",
                                                                }));
                                                                return;
                                                            }
                                                            const formatted = formatPhone(value);
                                                            setRegistroDraft((prev) => ({
                                                                ...prev,
                                                                fono: formatted,
                                                            }));
                                                        }}
                                                    />
                                                </div>
                                                <div className="sm:col-span-2 flex flex-col gap-2">
                                                    <div className="flex justify-start">
                                                        <Checkbox
                                                            classNames={{ label: "text-black" }}
                                                            isSelected={registroDraft.fallecido}
                                                            onValueChange={(selected) => {
                                                                setRegistroDraft((prev) => ({
                                                                    ...prev,
                                                                    fallecido: selected,
                                                                    fechaDefuncion: selected ? prev.fechaDefuncion : "",
                                                                }));
                                                            }}
                                                        >
                                                            Fallecido
                                                        </Checkbox>
                                                    </div>
                                                    {registroDraft.fallecido && (
                                                        <DatePicker
                                                            label="Fecha defunción (opcional)"
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
                                                            value={
                                                                registroDraft.fechaDefuncion
                                                                    ? (() => {
                                                                          const [year, month, day] = registroDraft.fechaDefuncion.split("-");
                                                                          if (!year || !month || !day) return null;
                                                                          const y = Number(year);
                                                                          const m = Number(month);
                                                                          const d = Number(day);
                                                                          if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
                                                                          return new CalendarDate(y, m, d);
                                                                      })()
                                                                    : null
                                                            }
                                                            onChange={(value) => {
                                                                if (value) {
                                                                    const yyyy = String(value.year).padStart(4, "0");
                                                                    const mm = String(value.month).padStart(2, "0");
                                                                    const dd = String(value.day).padStart(2, "0");
                                                                    const formatted = `${yyyy}-${mm}-${dd}`;

                                                                    setRegistroDraft((prev) => ({
                                                                        ...prev,
                                                                        fechaDefuncion: formatted,
                                                                    }));
                                                                } else {
                                                                    setRegistroDraft((prev) => ({
                                                                        ...prev,
                                                                        fechaDefuncion: "",
                                                                    }));
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </div>
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
                        <Modal
                            isOpen={isSelectAccionistaOpen}
                            onOpenChange={(open) => {
                                setIsSelectAccionistaOpen(open);
                                if (!open) {
                                    setListaAccionistasFilter("");
                                }
                            }}
                        >
                            <ModalContent className="bg-white text-gray-900">
                                {(onClose) => (
                                    <>
                                        <ModalHeader className="flex flex-col gap-1">
                                            Seleccionar accionista
                                            {!isListaAccionistasLoading && (
                                                <span className="text-xs font-normal text-gray-500">
                                                    Total accionistas: {listaAccionistas.length}
                                                </span>
                                            )}
                                        </ModalHeader>
                                        <ModalBody>
                                            {isListaAccionistasLoading ? (
                                                <div className="flex justify-center py-6">
                                                    <Spinner />
                                                </div>
                                            ) : listaAccionistas.length === 0 ? (
                                                <p className="text-sm text-gray-500">
                                                    No hay accionistas registrados para esta empresa.
                                                </p>
                                            ) : (
                                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 pr-1 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100">
                                                    {(listaAccionistasFilter.trim().length > 0
                                                        ? listaAccionistas.filter((acc) => {
                                                              const q = listaAccionistasFilter.trim().toLowerCase();
                                                              const nombre = String(acc.nombre || "").toLowerCase();
                                                              const apellidosFull = (
                                                                  [acc.apellido_paterno, acc.apellido_materno]
                                                                      .filter(Boolean)
                                                                      .join(" ")
                                                              ).toLowerCase();
                                                              const rut = formatRut(String(acc.rut || "")).toLowerCase();
                                                              const registro = String(acc.registro || "").toLowerCase();
                                                              return (
                                                                  nombre.includes(q) ||
                                                                  apellidosFull.includes(q) ||
                                                                  rut.includes(q) ||
                                                                  registro.includes(q)
                                                              );
                                                          })
                                                        : listaAccionistas
                                                    ).map((acc) => (
                                                        <button
                                                            key={acc.id}
                                                            type="button"
                                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 cursor-pointer"
                                                            onClick={() => {
                                                                handleSelectAccionistaFromList(acc);
                                                                onClose();
                                                            }}
                                                        >
                                                            <p className="font-medium text-gray-900">
                                                                {[acc.apellido_paterno, acc.apellido_materno, acc.nombre]
                                                                    .filter(Boolean)
                                                                    .join(" ") || "Sin nombre"}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {acc.rut
                                                                    ? formatRut(String(acc.rut))
                                                                    : "RUT no registrado"}
                                                                {acc.registro
                                                                    ? ` · Registro: ${acc.registro}`
                                                                    : ""}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </ModalBody>
                                        <ModalFooter>
                                            <div className="flex w-full items-center justify-end gap-2">
                                                <Input
                                                    radius="sm"
                                                    size="sm"
                                                    variant="bordered"
                                                    placeholder="Buscar..."
                                                    className="flex-1"
                                                    classNames={{
                                                        inputWrapper: "bg-white border-gray-200",
                                                        input: "text-black placeholder:text-gray-400",
                                                    }}
                                                    value={listaAccionistasFilter}
                                                    onValueChange={setListaAccionistasFilter}
                                                />
                                                <Button radius="sm" variant="flat" type="button" onPress={() => onClose()}>
                                                    Cerrar
                                                </Button>
                                            </div>
                                        </ModalFooter>
                                    </>
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
                                            <div className="rounded-md border border-red-700 bg-red-700 px-3 py-2">
                                                <p className="text-[11px] font-medium text-white/90">Accionista</p>
                                                <p className="text-base font-semibold text-white">
                                                    {[accionista.nombre, accionista.apellidoPaterno, accionista.apellidoMaterno]
                                                        .filter(Boolean)
                                                        .join(" ")}
                                                </p>
                                            </div>
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

                <Modal
                    isOpen={isDeleteAccionistaOpen}
                    onOpenChange={setIsDeleteAccionistaOpen}
                    size="sm"
                >
                    <ModalContent className="bg-white text-gray-900">
                        {(onClose) => (
                            <>
                                <ModalHeader className="flex flex-col gap-1">
                                    Confirmar eliminación
                                </ModalHeader>
                                <ModalBody>
                                    <p>
                                        ¿Estás seguro que deseas eliminar a este accionista?
                                    </p>
                                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                                        <p className="text-sm font-semibold text-red-700">
                                            {[accionista.nombre, accionista.apellidoPaterno, accionista.apellidoMaterno]
                                                .filter(Boolean)
                                                .join(" ") || "(Sin nombre)"}
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Esta acción eliminará al accionista y todos sus movimientos asociados permanentemente.
                                    </p>
                                </ModalBody>
                                <ModalFooter>
                                    <Button
                                        radius="sm"
                                        variant="flat"
                                        onPress={onClose}
                                        isDisabled={isDeletingAccionista}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        radius="sm"
                                        color="danger"
                                        variant="solid"
                                        onPress={handleDeleteAccionista}
                                        isLoading={isDeletingAccionista}
                                    >
                                        Eliminar accionista
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
