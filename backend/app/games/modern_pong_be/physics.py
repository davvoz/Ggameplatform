"""
Collision detection and resolution for server-side Pong simulation.

Pure static methods — no state, no side-effects beyond the entities passed in.
Follows the Single Responsibility Principle: only collision math lives here.
"""

import math


class CollisionSystem:
    """Static collision detection and resolution methods."""

    @staticmethod
    def check_ball_character(ball, player):
        """
        Detect and resolve ball vs character (circle-circle).
        Applies reflection, strength, spin, direction enforcement, and separation.
        Returns True if a collision occurred.
        """
        dx = ball.x - player.x
        dy = ball.y - player.y
        dist = math.sqrt(dx * dx + dy * dy)
        min_dist = ball.radius + player.hitbox_radius

        if dist >= min_dist:
            return False

        # Prevent division by zero
        if dist < 0.001:
            dist = 0.001

        # Normal vector
        nx = dx / dist
        ny = dy / dist

        # Reflect velocity
        dot = ball.vx * nx + ball.vy * ny
        ball.vx -= 2 * dot * nx
        ball.vy -= 2 * dot * ny

        # Hit strength multiplier
        ball.vx *= player.hit_strength
        ball.vy *= player.hit_strength

        # Spin / curve
        spin_amount = player.spin_factor
        ball.vx += spin_amount * (-50 if player.x > ball.x else 50)

        # Ensure ball moves away from hitter's half
        if player.is_top and ball.vy < 0:
            ball.vy = abs(ball.vy)
        elif not player.is_top and ball.vy > 0:
            ball.vy = -abs(ball.vy)

        # Separate
        overlap = min_dist - dist
        ball.x += nx * (overlap + 1)
        ball.y += ny * (overlap + 1)

        # Accelerate and clear shadow blaze
        ball.accelerate()
        if ball.shadow_blaze_timer > 0:
            ball.clear_shadow_blaze()

        return True

    @staticmethod
    def check_ball_powerup(ball, powerup):
        """Check if ball overlaps a power-up. Returns True if collected."""
        if not powerup.alive:
            return False
        dx = ball.x - powerup.x
        dy = ball.y - powerup.y
        dist = math.sqrt(dx * dx + dy * dy)
        return dist < ball.radius + powerup.radius

    @staticmethod
    def check_character_powerup(player, powerup):
        """Check if character overlaps a power-up. Returns True if collected."""
        if not powerup.alive:
            return False
        dx = player.x - powerup.x
        dy = player.y - powerup.y
        dist = math.sqrt(dx * dx + dy * dy)
        return dist < player.hitbox_radius + powerup.radius

    @staticmethod
    def check_ball_shield(ball, shield):
        """Check if ball overlaps an AABB shield/super-shield."""
        if not shield.alive:
            return False
        bx, by, br = ball.x, ball.y, ball.radius
        return (
            bx + br >= shield.x - shield.width / 2
            and bx - br <= shield.x + shield.width / 2
            and by + br >= shield.y - shield.height / 2
            and by - br <= shield.y + shield.height / 2
        )

    @staticmethod
    def check_ball_obstacle(ball, obstacle):
        """
        Resolve ball collision against an AABB obstacle (circle vs AABB).
        Returns True if collision occurred.
        """
        r = ball.radius
        cx, cy = ball.x, ball.y

        # Nearest point on AABB to circle center
        near_x = max(obstacle.x, min(cx, obstacle.x + obstacle.width))
        near_y = max(obstacle.y, min(cy, obstacle.y + obstacle.height))

        dx = cx - near_x
        dy = cy - near_y
        dist_sq = dx * dx + dy * dy

        if dist_sq >= r * r:
            return False

        # Determine dominant collision axis
        overlap_x = obstacle.overlap_x(cx, r)
        overlap_y = obstacle.overlap_y(cy, r)

        if overlap_x < overlap_y:
            ball.vx = -ball.vx
            ball.x += (1 if dx >= 0 else -1) * (r - abs(dx) + 1)
        else:
            ball.vy = -ball.vy
            ball.y += (1 if dy >= 0 else -1) * (r - abs(dy) + 1)

        return True

    @staticmethod
    def push_character_out_of_obstacle(player, obstacle):
        """Push a character out of an obstacle after movement (AABB vs circle)."""
        r = player.hitbox_radius
        cx, cy = player.x, player.y

        near_x = max(obstacle.x, min(cx, obstacle.x + obstacle.width))
        near_y = max(obstacle.y, min(cy, obstacle.y + obstacle.height))

        dx = cx - near_x
        dy = cy - near_y
        dist_sq = dx * dx + dy * dy

        if dist_sq >= r * r:
            return False

        dist = math.sqrt(dist_sq)
        if dist < 0.001:
            # Edge case: center inside AABB — push upward
            player.y = obstacle.y - r - 1
            return True

        overlap = r - dist
        player.x += (dx / dist) * (overlap + 1)
        player.y += (dy / dist) * (overlap + 1)
        return True
