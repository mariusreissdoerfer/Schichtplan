"""Simple shift schedule generator."""
from typing import List, Dict


def create_shift_plan(employees: List[str], days: List[str]) -> Dict[str, str]:
    """Return mapping of days to employees using round-robin assignment.

    Args:
        employees: List of employee names.
        days: List of days to assign shifts for.

    Returns:
        Dictionary mapping each day to an employee.
    """
    if not employees:
        raise ValueError("employees list must not be empty")
    plan = {}
    for idx, day in enumerate(days):
        employee = employees[idx % len(employees)]
        plan[day] = employee
    return plan


if __name__ == "__main__":
    staff = ["Anna", "Bob", "Carla"]
    work_days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    for day, worker in create_shift_plan(staff, work_days).items():
        print(f"{day}: {worker}")
