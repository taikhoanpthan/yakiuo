import json
import random
import sys

SIZE = 15
EMPTY = ""
AI = "O"
HUMAN = "X"


def in_bounds(row, col):
    return 0 <= row < SIZE and 0 <= col < SIZE


def line_score(board, row, col, mark, dr, dc):
    count = 1
    for direction in (1, -1):
        r, c = row + dr * direction, col + dc * direction
        while in_bounds(r, c) and board[r][c] == mark:
            count += 1
            r += dr * direction
            c += dc * direction
    return count


def would_win(board, row, col, mark):
    return any(line_score(board, row, col, mark, dr, dc) >= 5 for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)))


def nearby(board, row, col):
    for r in range(max(0, row - 2), min(SIZE, row + 3)):
        for c in range(max(0, col - 2), min(SIZE, col + 3)):
            if board[r][c] != EMPTY:
                return True
    return False


def strength(board, row, col, mark):
    return max(line_score(board, row, col, mark, dr, dc) for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)))


def choose_move(board, difficulty="medium", ai_mark=AI):
    opponent = HUMAN if ai_mark == AI else AI
    candidates = [(r, c) for r in range(SIZE) for c in range(SIZE) if board[r][c] == EMPTY and nearby(board, r, c)]
    if not candidates:
        return {"row": SIZE // 2, "col": SIZE // 2}

    if difficulty == "easy":
        row, col = random.choice(candidates)
        return {"row": row, "col": col}

    for mark in (ai_mark, opponent):
        for row, col in candidates:
            board[row][col] = mark
            wins = would_win(board, row, col, mark)
            board[row][col] = EMPTY
            if wins:
                return {"row": row, "col": col}

    def score(cell):
        row, col = cell
        board[row][col] = ai_mark
        attack = strength(board, row, col, ai_mark)
        board[row][col] = opponent
        defense = strength(board, row, col, opponent)
        board[row][col] = EMPTY
        distance = abs(row - SIZE // 2) + abs(col - SIZE // 2)
        multiplier = 16 if difficulty == "hard" else 12
        return max(attack * multiplier, defense * (multiplier - 2)) - distance * 0.05

    row, col = max(candidates, key=score)
    return {"row": row, "col": col}


def main():
    payload = json.load(sys.stdin)
    board = payload.get("board")
    if not isinstance(board, list) or len(board) != SIZE or any(not isinstance(row, list) or len(row) != SIZE for row in board):
        raise ValueError("Bàn cờ không hợp lệ")
    difficulty = payload.get("difficulty", "medium")
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"
    mark = payload.get("mark", AI)
    if mark not in (AI, HUMAN):
        mark = AI
    print(json.dumps(choose_move(board, difficulty, mark)))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)
