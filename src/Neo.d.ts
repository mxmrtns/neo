type NType = 
    | 'component'
    | 'button'



type ClassName = String;
interface Neo {
    ntypeMap: {
        [key in NType]: ClassName;
    };
    
    insideWorker: Boolean;

    applyClassConfig: (cls: NeoCoreBase) => void

    

}



//-------------

let Neo: Neo;
Neo.ntypeMap = {
    button: {}
}


Neo.applyClassConfig({})