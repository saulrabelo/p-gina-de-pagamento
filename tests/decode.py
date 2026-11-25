"""Decodifica a captura do QR de fato renderizado usando Pillow e libzbar."""
import ctypes as C
import ctypes.util
import sys
from PIL import Image

lib = C.CDLL(ctypes.util.find_library("zbar") or "libzbar.so.0")
ptr, integer = C.c_void_p, C.c_int
def bind(name, result, args):
    f = getattr(lib, "zbar_" + name)
    f.restype, f.argtypes = result, args
    return f
scanner = bind("image_scanner_create", ptr, [])()
image = bind("image_create", ptr, [])()
try:
    gray = Image.open(sys.argv[1]).convert("L")
    data = C.create_string_buffer(gray.tobytes())
    bind("image_set_format", None, [ptr, C.c_ulong])(image, int.from_bytes(b"Y800","little"))
    bind("image_set_size", None, [ptr,C.c_uint,C.c_uint])(image,*gray.size)
    bind("image_set_data", None, [ptr,ptr,C.c_ulong,ptr])(image,data,len(data)-1,None)
    assert bind("scan_image",integer,[ptr,ptr])(scanner,image) == 1
    symbol = bind("image_first_symbol",ptr,[ptr])(image)
    print(bind("symbol_get_data",C.c_char_p,[ptr])(symbol).decode("ascii"))
finally:
    bind("image_destroy",None,[ptr])(image)
    bind("image_scanner_destroy",None,[ptr])(scanner)
