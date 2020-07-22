import { layout } from 'locuszoom';

const region_layout : layout  = {

    width: 800,
    height: 400,
    "min_width": 800,
    "min_height": 400,
    responsive_resize: 'both',
    "resizable": "responsive",
    // aspect_ratio: 2, // do I want this?
    "min_region_scale": 2e4,
    "max_region_scale": 20e6,
    "panel_boundaries": true,
    mouse_guide: true,

    "dashboard": {
        "components": [{
            type: 'link',
            title: 'Go to Manhattan Plot',
            text:' Manhattan Plot',
            url: '/pheno/' + window.pheno.phenocode
        },{
            type: 'move',
            text: '<<',
            title: 'Shift view 1/4 to the left',
            direction: -0.75,
            group_position: "start",
        },{
            type: 'move',
            text: '<',
            title: 'Shift view 1/4 to the left',
            direction: -0.25,
            group_position: "middle",
        },{
            type: 'zoom_region',
            button_html: 'z+',
            title: 'zoom in 2x',
            step: -0.5,
            group_position: "middle",
        },{
            type: 'zoom_region',
            button_html: 'z-',
            title: 'zoom out 2x',
            step: 1,
            group_position: "middle",
        },{
            type: 'move',
            text: '>',
            title: 'Shift view 1/4 to the right',
            direction: 0.25,
            group_position: "middle",
        },{
            type: 'move',
            text: '>>',
            title: 'Shift view 3/4 to the right',
            direction: 0.75,
            group_position: "end",
        },{
            "type": "download",
            "position": "right",
        }]
    },
    "panels": []
}
