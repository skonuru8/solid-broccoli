import socket
import ssl
import tkinter
import tkinter.font
from dataclasses import dataclass

WIDTH, HEIGHT = 800, 600
HSTEP, VSTEP = 13, 18
SCROLL_STEP = 100


def request(host: str, port: int, path: str, scheme: str) -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP)
    sock.connect((host, port))

    if scheme == "https":
        context = ssl.create_default_context()
        sock = context.wrap_socket(sock, server_hostname=host)

    request_data = f"GET {path} HTTP/1.0\r\n"
    request_data += f"Host: {host}\r\n"
    request_data += "\r\n"
    sock.send(request_data.encode("utf8"))

    response = sock.makefile("r", encoding="utf8", newline="\r\n")
    status_line = response.readline()
    version, status, explanation = status_line.split(" ", 2)

    headers = {}
    while True:
        line = response.readline()
        if line == "\r\n":
            break
        header, value = line.split(":", 1)
        headers[header.casefold()] = value.strip()

    assert "transfer-encoding" not in headers
    assert "content-encoding" not in headers

    body = response.read()
    sock.close()
    return body


@dataclass
class URL:
    scheme: str
    host: str
    port: int
    path: str

    @classmethod
    def parse(cls, url: str) -> "URL":
        scheme, rest = url.split("://", 1)
        if scheme not in {"http", "https"}:
            raise ValueError(f"Unsupported scheme: {scheme}")

        if "/" not in rest:
            rest += "/"
        host, path = rest.split("/", 1)
        path = "/" + path

        if ":" in host:
            host, port_str = host.split(":", 1)
            port = int(port_str)
        else:
            port = 80 if scheme == "http" else 443

        return cls(scheme=scheme, host=host, port=port, path=path)

    def request(self) -> str:
        return request(self.host, self.port, self.path, self.scheme)


class Text:
    def __init__(self, text: str):
        self.text = text


class Tag:
    def __init__(self, tag: str):
        self.tag = tag


def lex(body: str):
    tokens = []
    buffer = ""
    in_tag = False
    for c in body:
        if c == "<":
            in_tag = True
            if buffer:
                tokens.append(Text(buffer))
            buffer = ""
        elif c == ">":
            in_tag = False
            tokens.append(Tag(buffer))
            buffer = ""
        else:
            buffer += c
    if not in_tag and buffer:
        tokens.append(Text(buffer))
    return tokens


_FONTS = {}


def get_font(size: int, weight: str, style: str):
    key = (size, weight, style)
    if key not in _FONTS:
        _FONTS[key] = tkinter.font.Font(size=size, weight=weight, slant=style)
    return _FONTS[key]


class Layout:
    def __init__(self, tokens):
        self.display_list = []
        self.cursor_x = HSTEP
        self.cursor_y = VSTEP
        self.weight = "normal"
        self.style = "roman"
        self.size = 12
        self.line = []

        for token in tokens:
            self.handle_token(token)
        self.flush_line()

    def handle_token(self, token):
        if isinstance(token, Text):
            for word in token.text.split():
                self.add_word(word)
        elif token.tag == "i":
            self.style = "italic"
        elif token.tag == "/i":
            self.style = "roman"
        elif token.tag == "b":
            self.weight = "bold"
        elif token.tag == "/b":
            self.weight = "normal"
        elif token.tag == "small":
            self.size -= 2
        elif token.tag == "/small":
            self.size += 2
        elif token.tag == "big":
            self.size += 4
        elif token.tag == "/big":
            self.size -= 4
        elif token.tag == "br":
            self.flush_line()
        elif token.tag == "/p":
            self.flush_line()
            self.cursor_y += VSTEP

    def add_word(self, word: str):
        font = get_font(self.size, self.weight, self.style)
        word_width = font.measure(word)
        if self.cursor_x + word_width > WIDTH - HSTEP:
            self.flush_line()
        self.line.append((self.cursor_x, word, font))
        self.cursor_x += word_width + font.measure(" ")

    def flush_line(self):
        if not self.line:
            return

        metrics = [font.metrics() for _, _, font in self.line]
        max_ascent = max(metric["ascent"] for metric in metrics)
        baseline = self.cursor_y + 1.25 * max_ascent

        for x, word, font in self.line:
            y = baseline - font.metrics("ascent")
            self.display_list.append((x, y, word, font))

        max_descent = max(metric["descent"] for metric in metrics)
        self.cursor_y = baseline + 1.25 * max_descent
        self.cursor_x = HSTEP
        self.line = []


class Browser:
    def __init__(self):
        self.window = tkinter.Tk()
        self.canvas = tkinter.Canvas(self.window, width=WIDTH, height=HEIGHT)
        self.canvas.pack()
        self.scroll = 0
        self.window.bind("<Down>", self.scrolldown)
        self.display_list = []

    def load(self, url: URL):
        body = url.request()
        tokens = lex(body)
        self.display_list = Layout(tokens).display_list
        self.draw()

    def draw(self):
        self.canvas.delete("all")
        for x, y, word, font in self.display_list:
            if y > self.scroll + HEIGHT:
                continue
            if y + font.metrics("linespace") < self.scroll:
                continue
            self.canvas.create_text(x, y - self.scroll, text=word, font=font, anchor="nw")

    def scrolldown(self, event):
        self.scroll += SCROLL_STEP
        self.draw()


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print("Usage: python browser.py <URL>")
        sys.exit(1)

    Browser().load(URL.parse(sys.argv[1]))
    tkinter.mainloop()
