// Listagem de dispositivos USB que aparecem como porta serial (COM no Windows,
// /dev/ttyUSB* / /dev/ttyACM* no Linux). Impressoras térmicas USB modernas
// expõem CDC-ACM serial — Elgin L42DT, Bematech, Daruma, Epson, Zebra ZD…
// todas funcionam assim, idem leitores RFID que falam ESC/POS-ish.
//
// Limitação: dispositivos que aparecem como HID puro (alguns leitores RFID
// que emulam teclado) não vão aparecer aqui. Pra esses, o caminho é o
// próprio usuário deixar foco no input — o leitor "digita" o EPC.

use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
pub struct SerialPortInfo {
    /// Nome do dispositivo (COM3 no Windows, /dev/ttyUSB0 no Linux)
    pub name: String,
    /// Categoria do dispositivo
    pub kind: SerialKind,
    /// Vendor ID em hex (4 chars) — só pra USB
    pub vid: Option<String>,
    /// Product ID em hex (4 chars) — só pra USB
    pub pid: Option<String>,
    /// Nome do produto reportado pelo USB descriptor (pode ser vazio)
    pub product: Option<String>,
    /// Nome do fabricante reportado pelo USB descriptor
    pub manufacturer: Option<String>,
    /// Serial number — útil pra distinguir 2 impressoras iguais
    pub serial_number: Option<String>,
}

#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SerialKind {
    Usb,
    Bluetooth,
    Pci,
    Unknown,
}

#[tauri::command]
pub fn list_serial_ports() -> Result<Vec<SerialPortInfo>, String> {
    let ports = serialport::available_ports().map_err(|e| e.to_string())?;
    let mapped: Vec<SerialPortInfo> = ports
        .into_iter()
        .map(|p| {
            use serialport::SerialPortType;
            match p.port_type {
                SerialPortType::UsbPort(info) => SerialPortInfo {
                    name: p.port_name,
                    kind: SerialKind::Usb,
                    vid: Some(format!("{:04x}", info.vid)),
                    pid: Some(format!("{:04x}", info.pid)),
                    product: info.product,
                    manufacturer: info.manufacturer,
                    serial_number: info.serial_number,
                },
                SerialPortType::BluetoothPort => SerialPortInfo {
                    name: p.port_name,
                    kind: SerialKind::Bluetooth,
                    vid: None,
                    pid: None,
                    product: None,
                    manufacturer: None,
                    serial_number: None,
                },
                SerialPortType::PciPort => SerialPortInfo {
                    name: p.port_name,
                    kind: SerialKind::Pci,
                    vid: None,
                    pid: None,
                    product: None,
                    manufacturer: None,
                    serial_number: None,
                },
                SerialPortType::Unknown => SerialPortInfo {
                    name: p.port_name,
                    kind: SerialKind::Unknown,
                    vid: None,
                    pid: None,
                    product: None,
                    manufacturer: None,
                    serial_number: None,
                },
            }
        })
        .collect();
    Ok(mapped)
}
