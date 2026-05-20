// Listagem de dispositivos USB que aparecem como porta serial.
// Cobre impressoras térmicas modernas (Elgin, Bematech, Daruma, Epson, Zebra ZD…)
// e leitores RFID com saída serial. NÃO cobre HID-as-keyboard (que digita o
// EPC no input focado — esses não precisam de "porta" porque entram como teclado).

import { invoke } from "@tauri-apps/api/core";

export type SerialKind = "usb" | "bluetooth" | "pci" | "unknown";

export type SerialPortInfo = {
  name: string;
  kind: SerialKind;
  vid: string | null;
  pid: string | null;
  product: string | null;
  manufacturer: string | null;
  serial_number: string | null;
};

/**
 * Lista todas as portas seriais (COM no Windows, ttyUSB/ttyACM no Linux)
 * disponíveis. Inclui USB, Bluetooth e PCI. Pra impressoras térmicas modernas,
 * USB é o que importa.
 */
export async function listSerialPorts(): Promise<SerialPortInfo[]> {
  return invoke<SerialPortInfo[]>("list_serial_ports");
}

/**
 * Constrói um label legível pro device baseado nos campos disponíveis.
 * "Elgin L42DT (COM3)" se manufacturer+product existem
 * "USB Serial Device (COM3)" se só temos vendor:product hex
 * "COM3" no pior caso
 */
export function describePort(port: SerialPortInfo): string {
  const parts: string[] = [];
  if (port.manufacturer) parts.push(port.manufacturer);
  if (port.product) parts.push(port.product);
  if (parts.length === 0 && port.vid && port.pid) {
    parts.push(`USB ${port.vid}:${port.pid}`);
  }
  if (parts.length === 0) parts.push(`Porta ${port.kind}`);
  return `${parts.join(" ")} (${port.name})`;
}
