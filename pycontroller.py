import pygame

pygame.init()
pygame.joystick.init()
c
# Check for connected joysticks (controllers)
if pygame.joystick.get_count() == 0:
    print("No joystick found.")
else:
    joystick = pygame.joystick.Joystick(0)  # Get the first joystick
    joystick.init()
    print(f"Connected controller: {joystick.get_name()}")

    try:
        while True:
            for event in pygame.event.get():
                if event.type == pygame.JOYAXISMOTION:
                    # Handle joystick axis movement (e.g., analog sticks, triggers)
                    # event.axis: Axis index (e.g., 0 for left stick X, 1 for left stick Y)
                    # event.value: Axis value (-1.0 to 1.0)
                    print(f"Axis {event.axis} moved to {event.value}")
                elif event.type == pygame.JOYBUTTONDOWN:
                    # Handle button presses
                    # event.button: Button index
                    print(f"Button {event.button} pressed")
                elif event.type == pygame.JOYBUTTONUP:
                    # Handle button releases
                    print(f"Button {event.button} released")
                else:
                    print("Waiting")

    except KeyboardInterrupt:
        print("Exiting.")
    finally:
        pygame.quit()