// Generador de códigos QR con soporte de tildes y ñ (UTF-8). Se carga solo cuando hace falta un QR.
import qrcode from "./qrcode.mjs";
import { stringToBytes } from "./qrcode-utf8.mjs";
qrcode.stringToBytes = stringToBytes;
export default qrcode;
