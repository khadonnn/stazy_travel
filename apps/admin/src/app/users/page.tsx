import { columns, User } from './columns';
import { DataTable } from '@/app/payments/data-table';
import { UsersTableWrapper } from '@/app/users/UsersTableWrapper';

const getData = async (): Promise<User[]> => {
    return [
        {
            id: '728ed521',

            status: 'active',
            fullName: 'John Doe',

            email: 'johndoe@gmail.com',
            avatar: 'https://picsum.photos/id/237/200/300',
        },
        {
            id: '728ed522',

            status: 'active',
            fullName: 'Jane Doe',

            email: 'janedoe@gmail.com',
            avatar: 'https://picsum.photos/id/238/200/300',
        },
        {
            id: '728ed523',

            status: 'active',
            fullName: 'Mike Galloway',

            email: 'mikegalloway@gmail.com',
            avatar: 'https://picsum.photos/id/239/200/300',
        },
        {
            id: '728ed524',

            status: 'inactive',
            fullName: 'Minerva Robinson',

            email: 'minerbarobinson@gmail.com',
            avatar: 'https://picsum.photos/id/240/200/300',
        },
        {
            id: '728ed525',

            status: 'active',
            fullName: 'Mable Clayton',

            email: 'mableclayton@gmail.com',
            avatar: 'https://picsum.photos/id/13/200/300',
        },
        {
            id: '728ed526',

            status: 'active',
            fullName: 'Nathan McDaniel',

            email: 'nathanmcdaniel@gmail.com',
            avatar: 'https://picsum.photos/id/32/200/300',
        },
        {
            id: '728ed527',

            status: 'active',
            fullName: 'Myrtie Lamb',

            email: 'myrtielamb@gmail.com',
            avatar: 'https://picsum.photos/id/55/200/300',
        },
        {
            id: '728ed528',

            status: 'active',
            fullName: 'Leona Bryant',

            email: 'leonabryant@gmail.com',
            avatar: 'https://picsum.photos/id/46/200/300',
        },
        {
            id: '728ed529',

            status: 'inactive',
            fullName: 'Aaron Willis',

            email: 'aaronwillis@gmail.com',
            avatar: 'https://picsum.photos/id/69/200/300',
        },
        {
            id: '728ed52a',

            status: 'active',
            fullName: 'Joel Keller',

            email: 'joelkeller@gmail.com',
            avatar: 'https://picsum.photos/id/26/200/300',
        },
        {
            id: '728ed52b',

            status: 'active',
            fullName: 'Daniel Ellis',

            email: 'danielellis@gmail.com',
            avatar: 'https://picsum.photos/id/87/200/300',
        },
        {
            id: '728ed52c',

            status: 'active',
            fullName: 'Gordon Kennedy',

            email: 'gordonkennedy@gmail.com',
            avatar: 'https://picsum.photos/id/66/200/300',
        },
        {
            id: '728ed52d',

            status: 'inactive',
            fullName: 'Emily Hoffman',

            email: 'emilyhoffman@gmail.com',
            avatar: 'https://picsum.photos/id/91/200/300',
        },
        {
            id: '728ed52e',

            status: 'active',
            fullName: 'Jeffery Garrett',

            email: 'jefferygarrett@gmail.com',
            avatar: 'https://picsum.photos/id/52/200/300',
        },
        {
            id: '728ed52f',

            status: 'active',
            fullName: 'Ralph Baker',

            email: 'ralphbaker@gmail.com',
            avatar: 'https://picsum.photos/id/6/200/300',
        },
        {
            id: '728ed52g',

            status: 'inactive',
            fullName: 'Seth Fields',

            email: 'sethfields@gmail.com',
            avatar: 'https://picsum.photos/id/30/200/300',
        },
        {
            id: '728ed52h',

            status: 'active',
            fullName: 'Julia Webb',

            email: 'juliawebb@gmail.com',
            avatar: 'https://picsum.photos/id/44/200/300',
        },
        {
            id: '728ed52i',

            status: 'active',
            fullName: 'Gary Banks',

            email: 'garybanks@gmail.com',
            avatar: 'https://picsum.photos/id/80/200/300',
        },
        {
            id: '728ed52j',

            status: 'inactive',
            fullName: 'Flora Chambers',

            email: 'florachambers@gmail.com',
            avatar: 'https://picsum.photos/id/23/200/300',
        },
        {
            id: '728ed52k',

            status: 'active',
            fullName: 'Steve Hanson',

            email: 'stevehanson@gmail.com',
            avatar: 'https://picsum.photos/id/40/200/300',
        },
        {
            id: '728ed52l',

            status: 'active',
            fullName: 'Lola Robinson',

            email: 'lolarobinson@gmail.com',
            avatar: 'https://picsum.photos/id/56/200/300',
        },
        {
            id: '728ed52m',

            status: 'active',
            fullName: 'Ethel Waters',

            email: 'ethelwaters@gmail.com',
            avatar: 'https://picsum.photos/id/26/200/300',
        },
        {
            id: '728ed52n',

            status: 'inactive',
            fullName: 'Grace Edwards',

            email: 'graceedwards@gmail.com',
            avatar: 'https://picsum.photos/id/83/200/300',
        },
        {
            id: '728ed52o',

            status: 'active',
            fullName: 'Sallie Wong',

            email: 'salliewong@gmail.com',
            avatar: 'https://picsum.photos/id/47/200/300',
        },
        {
            id: '728ed52p',

            status: 'active',
            fullName: 'Bryan Gutierrez',

            email: 'bryangutierrez@gmail.com',
            avatar: 'https://picsum.photos/id/51/200/300',
        },
        {
            id: '728ed52q',

            status: 'active',
            fullName: 'Erik Rice',

            email: 'erikrice@gmail.com',
            avatar: 'https://picsum.photos/id/19/200/300',
        },
        {
            id: '728ed52r',

            status: 'active',
            fullName: 'Jordan Atkins',

            email: 'jordanatkins@gmail.com',
            avatar: 'https://picsum.photos/id/2/200/300',
        },
        {
            id: '728ed52s',

            status: 'inactive',
            fullName: 'Bill Brewer',

            email: 'billbrewer@gmail.com',
            avatar: 'https://picsum.photos/id/60/200/300',
        },
        {
            id: '728ed52t',

            status: 'active',
            fullName: 'Edwin Morris',

            email: 'edwinmorris@gmail.com',
            avatar: 'https://picsum.photos/id/36/200/300',
        },
        {
            id: '728ed52u',

            status: 'active',
            fullName: 'Harold Becker',

            email: 'haroldbecker@gmail.com',
            avatar: 'https://picsum.photos/id/4/200/300',
        },
        {
            id: '728ed52v',

            status: 'active',
            fullName: 'Hannah Rodriguez',

            email: 'hannahrodriguez@gmail.com',
            avatar: 'https://picsum.photos/id/58/200/300',
        },
        {
            id: '728ed52w',

            status: 'active',
            fullName: 'Zachary Beck',

            email: 'zacharybeck@gmail.com',
            avatar: 'https://picsum.photos/id/89/200/300',
        },
        {
            id: '728ed52x',

            status: 'inactive',
            fullName: 'Frances Potter',

            email: 'francespotter@gmail.com',
            avatar: 'https://picsum.photos/id/77/200/300',
        },
        {
            id: '728ed52y',

            status: 'active',
            fullName: 'Raymond Murray',

            email: 'raymondmurray@gmail.com',
            avatar: 'https://picsum.photos/id/33/200/300',
        },
        {
            id: '728ed52z',

            status: 'active',
            fullName: 'Adam Sherman',

            email: 'adamsherman@gmail.com',
            avatar: 'https://picsum.photos/id/15/200/300',
        },
        {
            id: '728ed521f',

            status: 'active',
            fullName: 'Anne Cruz',

            email: 'annecruz@gmail.com',
            avatar: 'https://picsum.photos/id/71/200/300',
        },
    ];
};
const UsersPage = async () => {
    const data = await getData();
    return (
        <div className="">
            {/* <div className="bg-secondary mb-8 rounded-md px-4 py-2">
                <h1 className="font-semibold">All Payments</h1>
            </div> */}
            <UsersTableWrapper initialData={data} />
        </div>
    );
};
export default UsersPage;
