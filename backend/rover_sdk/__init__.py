"""
rover_sdk package init.
Exposes the Rover class and the pre-instantiated `rover` singleton
so player code can simply do:

    from rover_sdk import rover
    rover.drive("FRONT")
"""

from .rover import Rover, rover

__all__ = ["Rover", "rover"]
