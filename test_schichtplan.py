import unittest
from schichtplan import create_shift_plan


class ShiftPlanTest(unittest.TestCase):
    def test_round_robin(self):
        employees = ["A", "B"]
        days = ["Mon", "Tue", "Wed"]
        plan = create_shift_plan(employees, days)
        self.assertEqual(plan["Mon"], "A")
        self.assertEqual(plan["Tue"], "B")
        self.assertEqual(plan["Wed"], "A")

    def test_empty_employees(self):
        with self.assertRaises(ValueError):
            create_shift_plan([], ["Mon"])


if __name__ == "__main__":
    unittest.main()
