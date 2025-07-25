"""Entry point for the summon package when run as a module."""

import asyncio
from .server import main

if __name__ == "__main__":
    asyncio.run(main())
