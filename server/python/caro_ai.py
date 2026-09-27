import json
import random
import sys

SIZE = 15
EMPTY = ""
AI = "O"
HUMAN = "X"
DIRECTIONS = ((0, 1), (1, 0), (1, 1), (1, -1))

# A five is terminal. Open fours and open threes must receive vastly more
# weight than two disconnected stones; the previous AI only counted stones,
# which made it miss forks and very obvious threats.
PATTERN_SCORES = {
    (5, 0): 10_000_000,
    (4, 2): 1_000_000,
    (4, 1): 120_000,
    (3, 2): 25_000,
    (3, 1): 3_000,
    (2, 2): 600,
    (2, 1): 120,
    (1, 2): 20,
    (1, 1): 4,
}


def in_bounds(row, col):
    return 0 <= row < SIZE and 0 <= col < SIZE


def nearby(board, row, col, radius=2):
    for r in range(max(0, row - radius), min(SIZE, row + radius + 1)):
        for c in range(max(0, col - radius), min(SIZE, col + radius + 1)):
            if board[r][c] != EMPTY:
                return True
    return False


def candidates(board, radius=2):
    return [(r, c) for r in range(SIZE) for c in range(SIZE) if board[r][c] == EMPTY and nearby(board, r, c, radius)]


def run_and_open_ends(board, row, col, mark, dr, dc):
    count = 1
    open_ends = 0
    for direction in (1, -1):
        r, c = row + dr * direction, col + dc * direction
        while in_bounds(r, c) and board[r][c] == mark:
            count += 1
            r += dr * direction
            c += dc * direction
        if in_bounds(r, c) and board[r][c] == EMPTY:
            open_ends += 1
    return count, open_ends


def would_win(board, row, col, mark):
    return any(run_and_open_ends(board, row, col, mark, dr, dc)[0] >= 5 for dr, dc in DIRECTIONS)


def point_score(board, row, col, mark):
    """Score a move by its strongest line and its combined fork potential."""
    board[row][col] = mark
    lines = [run_and_open_ends(board, row, col, mark, dr, dc) for dr, dc in DIRECTIONS]
    board[row][col] = EMPTY
    best = max(PATTERN_SCORES.get((min(length, 5), ends), 0) for length, ends in lines)
    # Two separate open/broken threats are normally a forced win next turn.
    fork_bonus = sum(PATTERN_SCORES.get((min(length, 4), ends), 0) for length, ends in lines) * 0.18
    centre = (SIZE - 1) / 2
    centre_bonus = max(0, 8 - (abs(row - centre) + abs(col - centre))) * 2
    return best + fork_bonus + centre_bonus


def ordered_moves(board, mark, opponent, limit):
    moves = candidates(board)
    ranked = []
    for row, col in moves:
        attack = point_score(board, row, col, mark)
        defence = point_score(board, row, col, opponent)
        # Defence is deliberately slightly stronger: never trade a human open
        # four for a small attacking opportunity.
        ranked.append((max(attack, defence * 1.12), attack, defence, row, col))
    ranked.sort(reverse=True)
    return ranked[:limit]


def choose_move(board, difficulty="medium", ai_mark=AI):
    opponent = HUMAN if ai_mark == AI else AI
    moves = candidates(board)
    if not moves:
        return {"row": SIZE // 2, "col": SIZE // 2}

    if difficulty == "easy":
        # Easy stays intentionally imperfect, but still avoids a one-move loss.
        safe = []
        for row, col in moves:
            board[row][col] = opponent
            dangerous = would_win(board, row, col, opponent)
            board[row][col] = EMPTY
            if not dangerous:
                safe.append((row, col))
        row, col = random.choice(safe or moves)
        return {"row": row, "col": col}

    ranked = ordered_moves(board, ai_mark, opponent, 18 if difficulty == "hard" else 12)
    # Always take an immediate win or stop one. This must happen before the
    # heuristic/minimax search so tactical wins are never missed.
    for _total, _attack, _defence, row, col in ranked:
        board[row][col] = ai_mark
        wins = would_win(board, row, col, ai_mark)
        board[row][col] = EMPTY
        if wins:
            return {"row": row, "col": col}
    for _total, _attack, _defence, row, col in ranked:
        board[row][col] = opponent
        wins = would_win(board, row, col, opponent)
        board[row][col] = EMPTY
        if wins:
            return {"row": row, "col": col}

    if difficulty == "medium":
        _, _, _, row, col = ranked[0]
        return {"row": row, "col": col}

    # Hard: one-ply opponent look-ahead. It chooses a strong attack only if it
    # does not allow an even stronger human reply; this handles common forks.
    best_value = -float("inf")
    best_move = ranked[0][3:]
    for _total, attack, _defence, row, col in ranked:
        board[row][col] = ai_mark
        replies = ordered_moves(board, opponent, ai_mark, 10)
        opponent_best = replies[0][0] if replies else 0
        board[row][col] = EMPTY
        value = attack - opponent_best * 1.18
        if value > best_value:
            best_value = value
            best_move = (row, col)
    return {"row": best_move[0], "col": best_move[1]}


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
