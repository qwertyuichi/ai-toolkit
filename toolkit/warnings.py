from toolkit.print import print_acc


def warn(message: str) -> None:
    print_acc(f"WARNING: {message}")
    try:
        import gradio as gr
        gr.Warning(message)
    except Exception:
        pass
