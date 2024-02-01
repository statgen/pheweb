from pheweb.serve.components.coding.fs_storage import format_path, fetch_cluster_plot, FileCodingDAO

def test_format_path() -> None:
    assert format_path("","")("") == ""
    assert format_path("/root/","{plot_root}{variant}.png")("variant") == "/root/variant.png"
