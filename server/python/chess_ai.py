import json
import random
import sys

VALUE = {"P": 100, "N": 320, "B": 330, "R": 500, "Q": 900, "K": 20000}
KNIGHT = ((-2, -1), (-2, 1), (-1, -2), (-1, 2), (1, -2), (1, 2), (2, -1), (2, 1))
KING = ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1))

def inside(r, c): return 0 <= r < 8 and 0 <= c < 8
def color(piece): return piece[:1]

def moves(board, turn):
    result = []
    for r in range(8):
        for c in range(8):
            piece = board[r][c]
            if not piece or color(piece) != turn: continue
            kind = piece[1]
            if kind == "P":
                step, start = (-1, 6) if turn == "w" else (1, 1)
                if inside(r + step, c) and not board[r + step][c]:
                    result.append((r, c, r + step, c))
                    if r == start and not board[r + step * 2][c]: result.append((r, c, r + step * 2, c))
                for dc in (-1, 1):
                    nr, nc = r + step, c + dc
                    if inside(nr, nc) and board[nr][nc] and color(board[nr][nc]) != turn: result.append((r, c, nr, nc))
            elif kind in "NK":
                for dr, dc in (KNIGHT if kind == "N" else KING):
                    nr, nc = r + dr, c + dc
                    if inside(nr, nc) and (not board[nr][nc] or color(board[nr][nc]) != turn): result.append((r, c, nr, nc))
            else:
                directions = ((-1,0),(1,0),(0,-1),(0,1)) if kind == "R" else ((-1,-1),(-1,1),(1,-1),(1,1)) if kind == "B" else ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1))
                for dr, dc in directions:
                    nr, nc = r + dr, c + dc
                    while inside(nr, nc):
                        if not board[nr][nc]: result.append((r, c, nr, nc))
                        else:
                            if color(board[nr][nc]) != turn: result.append((r, c, nr, nc))
                            break
                        nr, nc = nr + dr, nc + dc
    return result

def choose(board, turn, difficulty):
    choices = moves(board, turn)
    if not choices: return None
    if difficulty == "easy": return random.choice(choices)
    ranked = []
    for move in choices:
        fr, fc, tr, tc = move
        capture = VALUE.get(board[tr][tc][1], 0) if board[tr][tc] else 0
        center = 12 - (abs(3.5 - tr) + abs(3.5 - tc)) * 2
        ranked.append((capture * (1.5 if difficulty == "hard" else 1) + center + random.random() * 8, move))
    return max(ranked)[1]

try:
    data = json.load(sys.stdin)
    move = choose(data["board"], data["turn"], data.get("difficulty", "medium"))
    if not move: raise ValueError("Không còn nước đi")
    fr, fc, tr, tc = move
    print(json.dumps({"from": {"row": fr, "col": fc}, "to": {"row": tr, "col": tc}}))
except Exception as error:
    print(json.dumps({"error": str(error)}))
    sys.exit(1)
