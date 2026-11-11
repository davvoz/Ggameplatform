"""Hexforge: errors shared by the rules and the service."""


class StaleState(Exception):
    """Another request saved this player first."""


class ActionError(Exception):
    """The action breaks a game rule; `code` says which (sent to the client)."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code
